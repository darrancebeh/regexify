// src/app/api/generate-regex/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Helper function to escape regex special characters
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      const placeholder = input.substring(i + 1, endIndex);
      let replacement = '';
      let foundPlaceholder = true;
      switch (placeholder.toLowerCase()) { // Case-insensitive placeholders
        case 'alpha': replacement = '[a-zA-Z]'; break;
        case 'lower': replacement = '[a-z]'; break;
        case 'upper': replacement = '[A-Z]'; break;
        case 'num': case 'digit': replacement = '\\d'; break;
        case 'alphanum': replacement = '[a-zA-Z0-9]'; break;
        case 'word': replacement = '\\w'; break; // Alphanumeric + underscore
        case 'symbol': replacement = '[^A-Za-z0-9\\s]'; break; // Not letter, digit, or whitespace
        case 'space': case 'whitespace': replacement = '\\s'; break;
        case 'any': replacement = '.'; break;
        case 'sol': replacement = '^'; break;
        case 'eol': replacement = '$'; break;
        default:
          foundPlaceholder = false;
          break;
      }
      if (foundPlaceholder) {
        result += replacement;
        i = endIndex + 1;
      } else { // Not a recognized placeholder, treat {key} as literal
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

    if (shouldNotMatch.length > 0) {
      const notMatchRegexPatterns = shouldNotMatch.map(s => `(?!^${parseUserInputToRegex(s)}$)`);
      generatedRegex = notMatchRegexPatterns.join('') + generatedRegex;
      explanation += ` Excludes cases (smart syntax parsed): ${shouldNotMatch.map(s => `"${s}"`).join(', ')}.`;
    }
    
    // Fallback if generatedRegex becomes empty for some reason but desiredMatches was present
    if (!generatedRegex.trim() && desiredMatches.trim()) {
        generatedRegex = escapeRegex(desiredMatches);
        explanation = `Matches the literal string: "${desiredMatches}" (fallback due to empty generation).`;
    }

    return NextResponse.json({ generatedRegex, regexExplanation: explanation });

  } catch (error) {
    console.error('Error generating regex:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to generate regex', details: message }, { status: 500 });
  }
}
