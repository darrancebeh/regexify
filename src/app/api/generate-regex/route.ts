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

    let generatedRegex = escapeRegex(desiredMatches);
    let explanation = `Matches the literal string: "${desiredMatches}".`;

    if (shouldMatch.length > 0) {
      const firstShouldMatch = shouldMatch[0];
      explanation = `Based on "${desiredMatches}" and "${firstShouldMatch}".`;

      // Attempt email pattern generalization
      const emailStructureRegex = /^([\w.-]+)@([\w.-]+)\.([a-zA-Z]{2,63})$/; // Common email structure
      const desiredEmailParts = desiredMatches.match(emailStructureRegex);
      const shouldMatchEmailParts = firstShouldMatch.match(emailStructureRegex);

      if (desiredEmailParts && shouldMatchEmailParts) {
        const userGen = generalizePattern(desiredEmailParts[1], shouldMatchEmailParts[1]);
        const domainGen = generalizePattern(desiredEmailParts[2], shouldMatchEmailParts[2]);
        // TLDs are often specific, but generalizePattern can handle if they differ (e.g. com vs org)
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
            // Using generalizePattern for single characters might be overkill, direct set is fine
            const chars = new Set([desiredMatches[charIdx], firstShouldMatch[charIdx]]);
            tempRegex += `[${Array.from(chars).map(c => escapeRegex(c)).join('')}]`;
          }
        }
        if (differencesFound) {
            generatedRegex = tempRegex;
            explanation = `Generalized character-by-character differences between "${desiredMatches}" and "${firstShouldMatch}".`;
        } else {
            // This case (same length, same content) means they are identical.
            explanation = `"${desiredMatches}" and "${firstShouldMatch}" are identical. Using literal match for "${desiredMatches}".`;
            generatedRegex = escapeRegex(desiredMatches); // Ensure it's the literal
        }

      } else if (desiredMatches !== firstShouldMatch) { // Different lengths or significantly different, and not emails
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
            if (!desiredMiddle && !shouldMatchMiddle && commonPrefix === desiredMatches && commonSuffix === "" && commonPrefix === firstShouldMatch){
                 // This case means one string is a prefix of the other, or they are identical.
                 // If identical, it's caught above. If one is prefix, generalizePattern might return empty or literal.
                 // Example: "abc" and "ab" -> prefix "ab", desiredMiddle "c", shouldMatchMiddle "" -> middlePattern "c"
                 // Example: "ab" and "abc" -> prefix "ab", desiredMiddle "", shouldMatchMiddle "c" -> middlePattern "c"
                 // This seems fine.
            } else if (!middlePattern && (desiredMiddle || shouldMatchMiddle)) {
                 // If generalizePattern returned empty but there was content, default to wildcard
                 middlePattern = '.+?';
                 generatedRegex = escapeRegex(commonPrefix) + middlePattern + escapeRegex(commonSuffix);
                 explanation = `Generalized with wildcard middle. Prefix: "${commonPrefix}", Suffix: "${commonSuffix}".`;
            }


        } else { // No common prefix/suffix, and middles are not both present or one is empty.
           explanation = `"${desiredMatches}" and "${firstShouldMatch}" are too different for simple prefix/suffix generalization. Using base regex for "${desiredMatches}".`;
           generatedRegex = escapeRegex(desiredMatches);
        }
      }
      
      if (shouldMatch.length > 1) {
        explanation += ` (Note: Only the first 'Should Match' example is used for this generalization).`;
      }
    }

    if (shouldNotMatch.length > 0) {
      const notMatchPatterns = shouldNotMatch.map(s => `(?!^${escapeRegex(s)}$)`);
      generatedRegex = notMatchPatterns.join('') + generatedRegex;
      explanation += ` Excludes cases: ${shouldNotMatch.join(', ')}.`;
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
