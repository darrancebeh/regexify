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

// New function to generalize a pattern from two strings
function generalizePattern(s1: string, s2: string): string {
  if (s1 === undefined || s2 === undefined) return '.+?'; // Should not happen with proper checks
  if (!s1 && !s2) return '';
  
  // Handle cases where one string is empty: generalize the non-empty one or return its literal
  if (!s1) {
    if (isDigits(s2)) return '\\d+';
    if (isLetters(s2)) return '[a-zA-Z]+';
    if (isAlphanumeric(s2)) return '\\w+';
    return escapeRegex(s2);
  }
  if (!s2) {
    if (isDigits(s1)) return '\\d+';
    if (isLetters(s1)) return '[a-zA-Z]+';
    if (isAlphanumeric(s1)) return '\\w+';
    return escapeRegex(s1);
  }

  if (s1 === s2) return escapeRegex(s1);

  if (isDigits(s1) && isDigits(s2)) return '\\d+';
  if (isLetters(s1) && isLetters(s2)) return '[a-zA-Z]+';
  if (isAlphanumeric(s1) && isAlphanumeric(s2)) return '\\w+';

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
    return generalized;
  }
  
  return '.+?'; // Default non-greedy wildcard for differing lengths/types not covered above
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

    if (usesSmartSyntaxInDesired) {
      generatedRegex = parseUserInputToRegex(desiredMatches);
      explanation = `Regex constructed from your smart syntax in "Desired Matches": "${desiredMatches}".`;
      if (shouldMatch.length > 0) {
        explanation += ` 'Should Match' examples are not used for generalization in this mode.`;
      }
    } else {
      // Original logic when no smart syntax in desiredMatches
      generatedRegex = escapeRegex(desiredMatches);
      explanation = `Matches the literal string: "${desiredMatches}".`;

      if (shouldMatch.length > 0) {
        const firstShouldMatch = shouldMatch[0];
        // Check if firstShouldMatch uses smart syntax - if so, we can't use current generalization
        const usesSmartSyntaxInShouldMatch = /\{[^}]+\}/.test(firstShouldMatch);

        if (usesSmartSyntaxInShouldMatch) {
            explanation = `Based on literal "${desiredMatches}" and smart syntax in first "Should Match" example "${firstShouldMatch}". The "Should Match" example was parsed directly: ${parseUserInputToRegex(firstShouldMatch)}. This mode doesn't combine them further.`;
            explanation += ` Using literal from "Desired Matches" as base. Smart syntax in "Should Match" is noted but not used for generalization against a literal "Desired Matches".`;
        } else {
            explanation = `Based on "${desiredMatches}" and "${firstShouldMatch}".`; // Default explanation

            // Attempt email pattern generalization (only if both are plain strings)
            const emailStructureRegex = /^([\w.-]+)@([\w.-]+)\.([a-zA-Z]{2,63})$/;
            const desiredEmailParts = desiredMatches.match(emailStructureRegex);
            const shouldMatchEmailParts = firstShouldMatch.match(emailStructureRegex);

            if (desiredEmailParts && shouldMatchEmailParts) {
              const userGen = generalizePattern(desiredEmailParts[1], shouldMatchEmailParts[1]);
              const domainGen = generalizePattern(desiredEmailParts[2], shouldMatchEmailParts[2]);
              const tldGen = generalizePattern(desiredEmailParts[3], shouldMatchEmailParts[3]);
              generatedRegex = `${userGen}@${domainGen}\\.${tldGen}`;
              explanation = `Generalized as an email pattern. User part: ${userGen}, Domain part: ${domainGen}, TLD part: ${tldGen}.`;
            } else if (desiredMatches.length === firstShouldMatch.length && desiredMatches !== firstShouldMatch) {
              let tempRegex = "";
              let differencesFound = false;
              for (let charIdx = 0; charIdx < desiredMatches.length; charIdx++) {
                if (desiredMatches[charIdx] === firstShouldMatch[charIdx]) {
                  tempRegex += escapeRegex(desiredMatches[charIdx]);
                } else {
                  differencesFound = true;
                  const chars = new Set([desiredMatches[charIdx], firstShouldMatch[charIdx]]);
                  tempRegex += `[${Array.from(chars).map(c => escapeRegex(c)).join('')}]`;
                }
              }
              if (differencesFound) {
                  generatedRegex = tempRegex;
                  explanation = `Generalized character-by-character differences between "${desiredMatches}" and "${firstShouldMatch}".`;
              } else {
                  explanation = `"${desiredMatches}" and "${firstShouldMatch}" are identical. Using literal match for "${desiredMatches}".`;
                  generatedRegex = escapeRegex(desiredMatches);
              }
            } else if (desiredMatches !== firstShouldMatch) { // Different lengths
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
                  explanation = `Generalized based on common prefix/suffix. Prefix: "${commonPrefix}", Middle: ${middlePattern}, Suffix: "${commonSuffix}".`;
                  if (!middlePattern && (desiredMiddle || shouldMatchMiddle)) {
                       middlePattern = '.+?';
                       generatedRegex = escapeRegex(commonPrefix) + middlePattern + escapeRegex(commonSuffix);
                       explanation = `Generalized with wildcard middle. Prefix: "${commonPrefix}", Suffix: "${commonSuffix}".`;
                  }
              } else {
                 explanation = `"${desiredMatches}" and "${firstShouldMatch}" are too different for simple prefix/suffix generalization. Using base regex for "${desiredMatches}".`;
                 generatedRegex = escapeRegex(desiredMatches);
              }
            }
        } // End of 'else' for usesSmartSyntaxInShouldMatch
        if (shouldMatch.length > 1 && !usesSmartSyntaxInShouldMatch) {
          explanation += ` (Note: Only the first 'Should Match' example is used for this generalization).`;
        }
      }
    } // End of 'else' for usesSmartSyntaxInDesired

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
    // const parsedDesiredForFallbackCheck = parseUserInputToRegex(desiredMatches); // This line is removed, use parsedDesiredForFallbackCheckInitial
    if (
      generatedRegex.trim() === '' &&
      desiredMatches.trim() !== '' &&
      !(parsedDesiredForFallbackCheckInitial === '' || parsedDesiredForFallbackCheckInitial === '^' || parsedDesiredForFallbackCheckInitial === '$' || parsedDesiredForFallbackCheckInitial === '^$')
    ) {
      // This block should ideally not be reached if a contradiction set generatedRegex to '(?!)'
      // because '(?!)' is not empty.
      // However, if it somehow becomes empty AND there was no contradiction, apply fallback.
      generatedRegex = escapeRegex(desiredMatches);
      explanation = `Matches the literal string: "${desiredMatches}" (final fallback as regex was empty).`;
    } else if (generatedRegex === '(?!)' && explanation.includes('Contradiction')) {
      // Explanation is already set for contradiction, do nothing more here.
    } else if (generatedRegex.trim() === '' && (parsedDesiredForFallbackCheckInitial === '' || parsedDesiredForFallbackCheckInitial === '^' || parsedDesiredForFallbackCheckInitial === '$' || parsedDesiredForFallbackCheckInitial === '^$')) {
      // If desired match is meant to be empty (like {sol}{eol}) and regex is empty, that's fine.
      // Explanation should reflect this from earlier stages.
      if (explanation.trim() === '' || explanation.startsWith('Matches the literal string:') || explanation.endsWith('(Fallback to literal desired match as previous steps resulted in an empty regex).')) { // Avoid overwriting specific smart syntax explanations or the initial fallback explanation
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
