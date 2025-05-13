// src/app/api/generate-regex/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Helper function to escape regex special characters
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// New helper function to append to explanation consistently
function appendToExplanation(currentExplanation: string, addition: string): string {
  if (currentExplanation.trim() && !currentExplanation.endsWith('.') && !currentExplanation.endsWith('?') && !currentExplanation.endsWith('!')) {
    currentExplanation += '.';
  }
  return currentExplanation.trim() + ' ' + addition;
}

// New helper functions for character type detection
function isDigits(str: string): boolean {
  return /^\d+$/.test(str);
}

function isLetters(str: string): boolean {
  return /^[a-zA-Z]+$/.test(str);
}

function isAlphanumeric(str: string): boolean {
  return /^\w+$/.test(str); // \w includes underscore
}

// Smart syntax definitions
const smartSyntaxDefinitions: { [key: string]: { regex: string; description: string; example: string } } = {
  'alpha': { regex: '[a-zA-Z]', description: 'any alphabet letter (a-z, A-Z)', example: 'a' },
  'lower': { regex: '[a-z]', description: 'any lowercase letter', example: 'x' },
  'upper': { regex: '[A-Z]', description: 'any uppercase letter', example: 'X' },
  'num': { regex: '\\d', description: 'any digit (0-9)', example: '1' },
  'digit': { regex: '\\d', description: 'any digit (0-9)', example: '2' },
  'alphanum': { regex: '[a-zA-Z0-9]', description: 'any letter or digit', example: 'b' },
  'word': { regex: '\\w', description: 'any word character (alphanumeric plus underscore)', example: 'w' },
  'symbol': { regex: '[^A-Za-z0-9\\s]', description: 'common symbols', example: '$' },
  'space': { regex: '\\s', description: 'any whitespace character', example: ' ' },
  'whitespace': { regex: '\\s', description: 'any whitespace character', example: '\\t' },
  'any': { regex: '.', description: 'any single character (except newline)', example: '*' },
  'sol': { regex: '^', description: 'start of line', example: '' }, // Example for SOL is tricky, represents a position
  'eol': { regex: '$', description: 'end of line', example: '' },   // Example for EOL is tricky
  'url': { regex: 'https?://(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&//=]*)', description: 'a URL (e.g., http://example.com)', example: 'http://example.com' },
  'ipv4': { regex: '(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)', description: 'an IPv4 address (e.g., 192.168.1.1)', example: '192.168.1.1' },
};

// New function to parse user input with special placeholders into a regex string
function parseUserInputToRegex(input: string): string {
  let result = '';
  let i = 0;
  while (i < input.length) {
    if (input[i] === '{') {
      const endIndex = input.indexOf('}', i);
      if (endIndex === -1) { // No closing brace, treat rest as literal
        result += escapeRegex(input.substring(i));
        break;
      }
      const fullPlaceholderContent = input.substring(i + 1, endIndex);
      
      let key = '';
      let basePlaceholderRegex = '';
      let quantifierSuffix = '';
      let parsedSuccessfully = false;

      // Regex to extract key and potential quantifier parts
      // Group 1: key_name (e.g., num)
      // Group 2: simple_quantifier (?, *, +)
      // Group 3: N (min count for {N} or {N,M} or {N,})
      // Group 4: M (max count for {N,M}) or empty string (for {N,})
      const structureRegex = /^([a-zA-Z_]+)(?:(\?|\\*|\\+)|:(\d+)(?:,(\d*))?)?$/;
      const match = fullPlaceholderContent.match(structureRegex);

      if (match) {
        key = match[1];
        const simpleQuantifier = match[2];
        const nVal = match[3];
        const mVal = match[4]; // undefined if no comma, empty string if N,

        const definition = smartSyntaxDefinitions[key.toLowerCase()];
        if (definition) {
          basePlaceholderRegex = definition.regex;
          parsedSuccessfully = true;
          if (simpleQuantifier) { // ?, *, +
            quantifierSuffix = simpleQuantifier;
          } else if (nVal) { // :N or :N,M or :N,
            if (mVal !== undefined) { // :N,M or :N, (mVal can be empty string for N,)
              quantifierSuffix = `{${nVal},${mVal}}`;
            } else { // :N
              quantifierSuffix = `{${nVal}}`;
            }
          }
          result += basePlaceholderRegex + quantifierSuffix;
          i = endIndex + 1;
        }
      }

      if (!parsedSuccessfully) {
        // Not a recognized placeholder or structure, treat {content} as literal
        result += escapeRegex(input.substring(i, endIndex + 1));
        i = endIndex + 1;
      }
    } else {
      // Find next '{' or end of string for literal part
      const nextBrace = input.indexOf('{', i);
      const endOfLiteral = nextBrace === -1 ? input.length : nextBrace;
      result += escapeRegex(input.substring(i, endOfLiteral));
      i = endOfLiteral;
    }
  }
  return result;
}

// Helper function to create a sample test string from smart syntax
function createTestStringFromSmartSyntax(input: string): string {
  return input.replace(/\{([a-zA-Z0-9_]+)([:?*+]\S*)?\}/g, (match, key) => {
    const definition = smartSyntaxDefinitions[key.toLowerCase()];
    return definition ? definition.example : match; // Use example from definition
  });
}

// Helper function to check if a string like "{word:3,}" is a standalone smart syntax key
function isSmartSyntaxKey(placeholderCandidate: string): boolean {
  if (!placeholderCandidate.startsWith('{') || !placeholderCandidate.endsWith('}')) {
    return false;
  }
  // Extract content within braces, e.g., "word:3," from "{word:3,}"
  const keyWithPotentialQuantifier = placeholderCandidate.slice(1, -1);
  // Extract base key before any quantifier like :N,M or ?,*,+
  // e.g., "word" from "word:3,", "num" from "num?"
  const key = keyWithPotentialQuantifier.split(/[:?*+]/)[0];
  return smartSyntaxDefinitions.hasOwnProperty(key.toLowerCase());
}

// Updated function to generalize a pattern from two strings - stricter logic
function generalizePattern(s1: string, s2: string): string {
  if (s1 === undefined && s2 === undefined) return ''; // Both undefined, return empty
  if (s1 === undefined) return s2 !== undefined ? escapeRegex(s2) : ''; // s1 undefined, use s2 literally or empty
  if (s2 === undefined) return s1 !== undefined ? escapeRegex(s1) : ''; // s2 undefined, use s1 literally or empty

  // 1. Handle cases where one or both strings are empty (after undefined checks)
  if (!s1 && !s2) return ''; // Both empty
  if (!s1) return escapeRegex(s2); // s1 empty, use s2 literally
  if (!s2) return escapeRegex(s1); // s2 empty, use s1 literally

  // 2. Identical strings
  if (s1 === s2) return escapeRegex(s1);

  // From here, s1 and s2 are non-empty and different.

  // 3. Both are digits
  if (isDigits(s1) && isDigits(s2)) {
    return '\\d+'; // Generalizes to one or more digits. e.g., "123", "45" -> \d+
  }

  // 4. Both are purely letters
  if (isLetters(s1) && isLetters(s2)) {
    return `(?:${escapeRegex(s1)}|${escapeRegex(s2)})`; // e.g., "com", "co" -> (?:com|co)
  }

  // 5. Both are alphanumeric (and not purely letters, due to order of checks)
  if (isAlphanumeric(s1) && isAlphanumeric(s2)) {
    return `(?:${escapeRegex(s1)}|${escapeRegex(s2)})`; // e.g., "user1", "fileA" -> (?:user1|fileA)
  }

  // 6. Same length, but different characters and not covered by above (e.g., contains symbols)
  if (s1.length === s2.length) {
    let generalized = '';
    for (let i = 0; i < s1.length; i++) {
      if (s1[i] === s2[i]) {
        generalized += escapeRegex(s1[i]);
      } else {
        const charSet = new Set([s1[i], s2[i]]);
        generalized += `[${Array.from(charSet).map(c => escapeRegex(c)).join('')}]`;
      }
    }
    return generalized; // e.g., "item-A", "item_B" -> "item[-_][AB]"
  }

  // 7. Fallback for different lengths and different types not covered above
  return `(?:${escapeRegex(s1)}|${escapeRegex(s2)})`; // Strictest fallback
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      desiredMatches,
      shouldMatch: shouldMatchInput,
      shouldNotMatch: shouldNotMatchInput,
    } = body;

    if (!desiredMatches || typeof desiredMatches !== 'string' || desiredMatches.trim() === '') {
      return NextResponse.json({ error: 'desiredMatches is required and must be a non-empty string' }, { status: 400 });
    }

    const shouldMatch: string[] = Array.isArray(shouldMatchInput)
      ? shouldMatchInput.filter(item => typeof item === 'string' && item.trim() !== '')
      : (typeof shouldMatchInput === 'string' && shouldMatchInput.trim() !== '' ? [shouldMatchInput.trim()] : []);

    const shouldNotMatch: string[] = Array.isArray(shouldNotMatchInput)
      ? shouldNotMatchInput.filter(item => typeof item === 'string' && item.trim() !== '')
      : (typeof shouldNotMatchInput === 'string' && shouldNotMatchInput.trim() !== '' ? [shouldNotMatchInput.trim()] : []);

    let generatedRegex = '';
    let explanation = '';

    const usesSmartSyntaxInDesired = /\{[^}]+\}/.test(desiredMatches);
    const firstShouldMatch = shouldMatch.length > 0 ? shouldMatch[0] : null;
    const usesSmartSyntaxInShouldMatch = firstShouldMatch ? /\{[^}]+\}/.test(firstShouldMatch) : false;

    const dmExampleForGen = usesSmartSyntaxInDesired ? createTestStringFromSmartSyntax(desiredMatches) : desiredMatches;
    const smExampleForGen = firstShouldMatch ? (usesSmartSyntaxInShouldMatch ? createTestStringFromSmartSyntax(firstShouldMatch) : firstShouldMatch) : null;

    let emailLogicApplied = false;
    let generalizationOccurredBasedOnShouldMatch = false;

    const emailStructureRegex = /^([\w.-]+)@([\w.-]+)\.([a-zA-Z]{2,63})$/;
    const dmIsEmailLike = emailStructureRegex.test(dmExampleForGen);
    const smIsEmailLike = smExampleForGen ? emailStructureRegex.test(smExampleForGen) : false;

    // Main Email Logic Block
    if (dmIsEmailLike && smIsEmailLike && firstShouldMatch && smExampleForGen) {
      const smEmailActualParts = smExampleForGen.match(emailStructureRegex)!; // Guaranteed to match due to smIsEmailLike
      const smUserLiteral = smEmailActualParts[1];
      const smDomainLiteral = smEmailActualParts[2];
      const smTldLiteral = smEmailActualParts[3];

      const dmAtIdx = desiredMatches.indexOf('@');
      const dmLastDotIdx = desiredMatches.lastIndexOf('.');

      // Check if desiredMatches has a clear user@domain.tld structure with literal '@' and '.'
      // This allows for smart syntax within parts, e.g., {word:3,}@gmail.com
      if (dmAtIdx > 0 && dmLastDotIdx > dmAtIdx + 1 && dmLastDotIdx < desiredMatches.length - 1) {
        const dmUserOriginalComponent = desiredMatches.substring(0, dmAtIdx);
        const dmDomainOriginalComponent = desiredMatches.substring(dmAtIdx + 1, dmLastDotIdx);
        const dmTldOriginalComponent = desiredMatches.substring(dmLastDotIdx + 1);

        let finalUserRegex, finalDomainRegex, finalTldRegex;

        // User Part
        if (isSmartSyntaxKey(dmUserOriginalComponent.trim())) {
          finalUserRegex = parseUserInputToRegex(dmUserOriginalComponent);
        } else { 
          const dmUserLiteralExample = dmExampleForGen.match(emailStructureRegex)![1];
          finalUserRegex = generalizePattern(dmUserLiteralExample, smUserLiteral);
        }

        // Domain Part
        if (isSmartSyntaxKey(dmDomainOriginalComponent.trim())) {
          finalDomainRegex = parseUserInputToRegex(dmDomainOriginalComponent);
        } else {
          const dmDomainLiteralExample = dmExampleForGen.match(emailStructureRegex)![2];
          finalDomainRegex = generalizePattern(dmDomainLiteralExample, smDomainLiteral);
        }

        // TLD Part
        if (isSmartSyntaxKey(dmTldOriginalComponent.trim())) {
          finalTldRegex = parseUserInputToRegex(dmTldOriginalComponent);
        } else {
          const dmTldLiteralExample = dmExampleForGen.match(emailStructureRegex)![3];
          finalTldRegex = generalizePattern(dmTldLiteralExample, smTldLiteral);
        }
        
        generatedRegex = `${finalUserRegex}@${finalDomainRegex}\\.${finalTldRegex}`;
        explanation = `Generalized as a hybrid email pattern. User: ${finalUserRegex}, Domain: ${finalDomainRegex}, TLD: ${finalTldRegex}. Derived from "Desired Matches" ("${desiredMatches}") and "Should Match" ("${firstShouldMatch}").`;
        emailLogicApplied = true;
        generalizationOccurredBasedOnShouldMatch = true;

      } else if (usesSmartSyntaxInDesired) {
        // desiredMatches does not have simple user@domain.tld structure with literal separators 
        // (e.g. "{mySmartEmailPlaceholder}" or uses smart syntax for '@' or '.')
        // but dmExampleForGen is email-like. Let parseUserInputToRegex handle desiredMatches entirely.
        generatedRegex = parseUserInputToRegex(desiredMatches);
        explanation = `Regex constructed from Smart Syntax in "Desired Matches" ("${desiredMatches}"), which appears to define an email structure.`;
        try {
          const testRegex = new RegExp(`^(${generatedRegex})$`);
          if (testRegex.test(smExampleForGen)) {
            explanation = appendToExplanation(explanation, `The "Should Match" example ("${firstShouldMatch}") is compatible with this regex.`);
          } else {
            explanation = appendToExplanation(explanation, `The "Should Match" example ("${firstShouldMatch}") is NOT compatible. The regex remains based on "Desired Matches" Smart Syntax.`);
          }
        } catch (e) {
          console.warn(`Error testing ShouldMatch against SmartSyntax-derived regex: ${e instanceof Error ? e.message : String(e)}`);
          explanation = appendToExplanation(explanation, `Could not test "Should Match" example due to an error. Regex based on "Desired Matches" Smart Syntax.`);
        }
        emailLogicApplied = true;
        // generalizationOccurredBasedOnShouldMatch is false because SM didn't drive generation here.
      } else {
        // desiredMatches is literal, and dmExampleForGen is email-like, and smExampleForGen is email-like
        // This is the pure literal email generalization path.
        const dmEmailParts = dmExampleForGen.match(emailStructureRegex)!;
        // smEmailActualParts is already defined and can be reused as smEmailParts
        const userGen = generalizePattern(dmEmailParts[1], smUserLiteral); // smUserLiteral from smEmailActualParts[1]
        const domainGen = generalizePattern(dmEmailParts[2], smDomainLiteral); // smDomainLiteral from smEmailActualParts[2]
        const tldGen = generalizePattern(dmEmailParts[3], smTldLiteral); // smTldLiteral from smEmailActualParts[3]
        generatedRegex = `${userGen}@${domainGen}\\.${tldGen}`;
        explanation = `Generalized as an email pattern from literal examples "${desiredMatches}" and "${firstShouldMatch}". User: ${userGen}, Domain: ${domainGen}, TLD: ${tldGen}.`;
        emailLogicApplied = true;
        generalizationOccurredBasedOnShouldMatch = true;
      }
    } else if (dmIsEmailLike && usesSmartSyntaxInDesired) { // DM is email-like (via Smart Syntax), but SM is not email-like or not present
        generatedRegex = parseUserInputToRegex(desiredMatches);
        explanation = `Regex constructed from Smart Syntax in "Desired Matches" ("${desiredMatches}"), which defines an email structure.`;
        if (firstShouldMatch) {
            explanation = appendToExplanation(explanation, `The "Should Match" example ("${firstShouldMatch}") was not email-like or not suitable for combined email generalization.`);
        }
        emailLogicApplied = true;
        // generalizationOccurredBasedOnShouldMatch remains false
    } else if (dmIsEmailLike && !usesSmartSyntaxInDesired) { // DM is literal email, but SM is not email-like or not present
        generatedRegex = escapeRegex(desiredMatches);
        explanation = `Matches the literal email string: "${desiredMatches}".`;
        if (firstShouldMatch) {
            explanation = appendToExplanation(explanation, `The "Should Match" example ("${firstShouldMatch}") was not email-like or not suitable for structural generalization with the email.`);
        } else {
            explanation = appendToExplanation(explanation, `No "Should Match" example provided to generalize the email structure.`);
        }
        emailLogicApplied = true;
        // generalizationOccurredBasedOnShouldMatch remains false
    }

    // Fallback / General non-email logic (if emailLogicApplied is false)
    if (!emailLogicApplied) {
      if (usesSmartSyntaxInDesired) { 
        generatedRegex = parseUserInputToRegex(desiredMatches);
        explanation = `Regex constructed from Smart Syntax in "Desired Matches": "${desiredMatches}".`;
        if (firstShouldMatch) {
          explanation = appendToExplanation(explanation, `The "Should Match" example ("${firstShouldMatch}") was also considered. Since "Desired Matches" uses Smart Syntax and no structural email generalization was applied, the regex is primarily based on the Smart Syntax.`);
        }
      } else { // DesiredMatches is literal 
        generatedRegex = escapeRegex(desiredMatches);
        explanation = `Matches the literal string: "${desiredMatches}".`;

        if (firstShouldMatch && smExampleForGen) { // SM exists and is usable
          explanation = appendToExplanation(explanation, `Considering "Should Match" example: "${firstShouldMatch}".`);
          if (usesSmartSyntaxInShouldMatch) {
            explanation = appendToExplanation(explanation, `It uses Smart Syntax. Generalizing a literal "Desired Match" with a Smart Syntax "Should Match" is complex; the regex currently remains based on the literal "Desired Match".`);
          } else { // Literal DM, Literal SM 
            if (desiredMatches.length === firstShouldMatch.length && desiredMatches !== firstShouldMatch) {
              let tempRegex = "";
              for (let charIdx = 0; charIdx < desiredMatches.length; charIdx++) {
                if (desiredMatches[charIdx] === firstShouldMatch[charIdx]) {
                  tempRegex += escapeRegex(desiredMatches[charIdx]);
                } else {
                  const chars = new Set([desiredMatches[charIdx], firstShouldMatch[charIdx]]);
                  tempRegex += `[${Array.from(chars).map(c => escapeRegex(c)).join('')}]`;
                }
              }
              generatedRegex = tempRegex;
              explanation = appendToExplanation(explanation, `Generalized character-by-character differences.`);
              generalizationOccurredBasedOnShouldMatch = true;
            } else if (desiredMatches !== firstShouldMatch) { 
              let commonPrefix = '';
              let i = 0;
              while (i < desiredMatches.length && i < firstShouldMatch.length && desiredMatches[i] === firstShouldMatch[i]) {
                commonPrefix += desiredMatches[i];
                i++;
              }
              let commonSuffix = '';
              let jDesired = desiredMatches.length - 1;
              let jShould = firstShouldMatch.length - 1;
              while (jDesired >= i && jShould >= i && desiredMatches[jDesired] === firstShouldMatch[jShould]) {
                commonSuffix = desiredMatches[jDesired] + commonSuffix;
                jDesired--;
                jShould--;
              }
              const desiredMiddle = desiredMatches.substring(i, jDesired + 1);
              const shouldMatchMiddle = firstShouldMatch.substring(i, jShould + 1);

              if (commonPrefix.length > 0 || commonSuffix.length > 0 || (desiredMiddle && shouldMatchMiddle)) {
                  let middlePattern = generalizePattern(desiredMiddle, shouldMatchMiddle);
                  generatedRegex = escapeRegex(commonPrefix) + middlePattern + escapeRegex(commonSuffix);
                  explanation = appendToExplanation(explanation, `Generalized based on common prefix/suffix. Prefix: "${commonPrefix}", Middle: ${middlePattern}, Suffix: "${commonSuffix}".`);
                  if (!middlePattern && (desiredMiddle || shouldMatchMiddle)) {
                       middlePattern = '.+?'; 
                       generatedRegex = escapeRegex(commonPrefix) + middlePattern + escapeRegex(commonSuffix);
                       explanation = appendToExplanation(explanation, `Middle part further generalized with a wildcard as specific generalization was not possible.`);
                  }
                  generalizationOccurredBasedOnShouldMatch = true;
              } else { 
                 explanation = appendToExplanation(explanation, `They are too different for simple prefix/suffix generalization. Regex remains based on "Desired Matches".`);
              }
            } else { // identical
                 explanation = appendToExplanation(explanation, `It is identical to "Desired Matches".`);
            }
          }
        }
      }
    }
    
    if (generalizationOccurredBasedOnShouldMatch && shouldMatch.length > 1) {
        explanation = appendToExplanation(explanation, `(Note: Only the first 'Should Match' example is used for this generalization).`);
    }

    // Fallback if generatedRegex is empty or only whitespace,
    // and desiredMatches was provided and not empty,
    // and desiredMatches was not something that should naturally parse to an empty-match regex like {sol}{eol}
    const parsedDesiredForFallbackCheckInitial = parseUserInputToRegex(desiredMatches); // Renamed variable
    if (
      generatedRegex.trim() === '' &&
      desiredMatches.trim() !== '' &&
      !(parsedDesiredForFallbackCheckInitial === '' || parsedDesiredForFallbackCheckInitial === '^' || parsedDesiredForFallbackCheckInitial === '$' || parsedDesiredForFallbackCheckInitial === '^$')
    ) {
      generatedRegex = escapeRegex(desiredMatches);
      explanation = appendToExplanation(explanation, `(Fallback to literal desired match as previous steps resulted in an empty regex).`);
    }

    // Process shouldNotMatch
    if (shouldNotMatch.length > 0) {
      const activelyExcludedItems: string[] = [];
      let contradictionFound = false;

      for (const snmItem of shouldNotMatch) {
        if (!snmItem.trim()) continue;

        const parsedSnmRegexComponent = parseUserInputToRegex(snmItem);
        if (!parsedSnmRegexComponent && snmItem.trim()) {
          console.warn(`Skipping shouldNotMatch item "${snmItem}" as it parsed to an empty regex component.`);
          continue;
        }

        // Check for direct contradiction
        if (generatedRegex.trim() !== '' && parsedSnmRegexComponent === generatedRegex) {
          generatedRegex = '(?!)'; // Regex that never matches
          explanation = `Contradiction: The 'Should Not Match' item "${snmItem}" directly negates the entire pattern. The regex will not match anything.`;
          contradictionFound = true;
          break; // No need to process further SNM items
        }

        const testStringForSnm = createTestStringFromSmartSyntax(snmItem);
        let needsExclusion = false;

        if (generatedRegex.trim() || testStringForSnm === "") {
          try {
            const currentRegexObject = new RegExp(`^(${generatedRegex})$`);
            if (testStringForSnm === "") {
              needsExclusion = currentRegexObject.test("");
            } else {
              needsExclusion = currentRegexObject.test(testStringForSnm);
            }
          } catch (e) {
            needsExclusion = false;
            console.warn(`Could not test current generatedRegex ("${generatedRegex}") against "${testStringForSnm}" (from SNM item "${snmItem}") due to regex error: ${e instanceof Error ? e.message : String(e)}. Assuming no exclusion needed as current regex is broken.`);
          }
        } else {
          needsExclusion = false;
        }

        if (needsExclusion) {
          generatedRegex = `(?!^${parsedSnmRegexComponent}$)${generatedRegex}`;
          activelyExcludedItems.push(snmItem);
        }
      }

      if (!contradictionFound) {
        if (activelyExcludedItems.length > 0) {
          explanation = appendToExplanation(explanation, `Actively excluded cases: ${activelyExcludedItems.map(s => `"${s}"`).join(', ')}.`);
        } else if (shouldNotMatch.filter(s => s.trim()).length > 0) {
          explanation = appendToExplanation(explanation, `All 'Should Not Match' cases were already avoided by the generated regex or the base regex was effectively empty.`);
        }
      }
    }

    // Final fallback logic, adjusted for contradiction
    if (
      generatedRegex.trim() === '' &&
      desiredMatches.trim() !== '' &&
      !(parsedDesiredForFallbackCheckInitial === '' || parsedDesiredForFallbackCheckInitial === '^' || parsedDesiredForFallbackCheckInitial === '$' || parsedDesiredForFallbackCheckInitial === '^$')
    ) {
      generatedRegex = escapeRegex(desiredMatches);
      explanation = `Matches the literal string: "${desiredMatches}" (final fallback as regex was empty).`;
    } else if (generatedRegex === '(?!)' && explanation.includes('Contradiction')) {
      // Explanation is already set for contradiction, do nothing more here.
    } else if (generatedRegex.trim() === '' && (parsedDesiredForFallbackCheckInitial === '' || parsedDesiredForFallbackCheckInitial === '^' || parsedDesiredForFallbackCheckInitial === '$' || parsedDesiredForFallbackCheckInitial === '^$')) {
      if (explanation.trim() === '' || explanation.startsWith('Matches the literal string:') || explanation.endsWith('(Fallback to literal desired match as previous steps resulted in an empty regex).')) {
         explanation = appendToExplanation(explanation, `The regex matches an empty string or specific position based on input like "${desiredMatches}".`);
      }
    }

    return NextResponse.json({ generatedRegex, regexExplanation: explanation });

  } catch (error) {
    console.error('Error generating regex:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to generate regex', details: message }, { status: 500 });
  }
}
