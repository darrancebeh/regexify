'use client';
import React, { useState, useEffect } from 'react';

function MainPage() {
  const [sampleText, setSampleText] = useState('');
  const [desiredMatches, setDesiredMatches] = useState('');
  const [shouldMatch, setShouldMatch] = useState('');
  const [shouldNotMatch, setShouldNotMatch] = useState('');
  const [generatedRegex, setGeneratedRegex] = useState('');
  const [regexExplanation, setRegexExplanation] = useState('');

  useEffect(() => {
    if (desiredMatches) {
      // Basic regex generation: treat desiredMatches as a literal string for now
      const escapedMatches = desiredMatches.replace(/[.*+?^${}()|[\\\\]]/g, '\\\\$&');
      setGeneratedRegex(escapedMatches);
      setRegexExplanation(`Matches the literal string: "${desiredMatches}"`);
    } else {
      setGeneratedRegex('');
      setRegexExplanation('');
    }
  }, [desiredMatches]);

  useEffect(() => {
    if (generatedRegex && sampleText) {
      try {
        // const regex = new RegExp(generatedRegex, 'g'); // Not used directly here, matching is in JSX
      } catch (error) {
        console.error("Error matching sample text:", error);
      }
    }

    if (generatedRegex && shouldNotMatch) {
        try {
            // const regex = new RegExp(generatedRegex, 'g'); // Not used directly here, matching is in JSX
        } catch (error) {
            console.error("Error testing shouldNotMatch cases:", error);
        }
    }
  }, [generatedRegex, sampleText, shouldNotMatch]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Re:Gex-ify, a RegEx Generator.
        <span className="text-sm font-normal text-gray-500 ml-2">by db</span>
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="sampleText" className="block text-sm font-medium text-gray-700">
            Sample Text
          </label>
          <textarea
            id="sampleText"
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            rows={5}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 min-h-32"
            placeholder="Enter your sample text here..."
          />
        </div>
        <div>
          <label htmlFor="desiredMatches" className="block text-sm font-medium text-gray-700">
            Desired Matches (Highlight or type the parts to match)
          </label>
          <textarea
            id="desiredMatches"
            value={desiredMatches}
            onChange={(e) => setDesiredMatches(e.target.value)}
            rows={5}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 min-h-32"
            placeholder="e.g., timestamps, IP addresses"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="shouldMatch" className="block text-sm font-medium text-gray-700">
            Should Match Test Cases (one per line)
          </label>
          <textarea
            id="shouldMatch"
            value={shouldMatch}
            onChange={(e) => setShouldMatch(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 min-h-20"
            placeholder="Text that the regex MUST match"
          />
        </div>
        <div>
          <label htmlFor="shouldNotMatch" className="block text-sm font-medium text-gray-700">
            Should Not Match Test Cases (one per line)
          </label>
          <textarea
            id="shouldNotMatch"
            value={shouldNotMatch}
            onChange={(e) => setShouldNotMatch(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 min-h-20"
            placeholder="Text that the regex MUST NOT match"
          />
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold">Generated Regex:</h2>
        <pre className="bg-gray-800 text-white p-2 rounded-md overflow-x-auto">
          {generatedRegex || 'No regex generated yet.'}
        </pre>
        <p className="text-sm text-gray-600 mt-1">{regexExplanation}</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold">Real-time Feedback:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <h3 className="text-lg font-medium">Matches in Sample Text:</h3>
                {sampleText && generatedRegex ? (
                    <div
                    className="bg-gray-50 p-2 rounded-md whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                        __html: sampleText.replace(
                        new RegExp(`(${generatedRegex})`, 'g'),
                        '<strong class="bg-yellow-200">$1</strong>'
                        ),
                    }}
                    />
                ) : (
                    <p className="text-gray-500">Enter sample text and desired matches to see results.</p>
                )}
            </div>
            <div>
                <h3 className="text-lg font-medium">Should Match&quot; Test Case Results:</h3>
                {shouldMatch && generatedRegex ? (
                shouldMatch.split('\\n').map((line, index) => (
                    <div key={index} className={`p-1 ${new RegExp(`^${generatedRegex}$`).test(line) ? 'bg-green-100' : 'bg-red-100'}`}>
                    {line} - {new RegExp(`^${generatedRegex}$`).test(line) ? 'Matches' : 'Does not match'}
                    </div>
                ))
                ) : (
                <p className="text-gray-500">Enter &quot;Should Match&quot; test cases and generate a regex.</p>
                )}
            </div>
            <div>
                <h3 className="text-lg font-medium">Should Not Match&quot; Test Case Results:</h3>
                {shouldNotMatch && generatedRegex ? (
                shouldNotMatch.split('\\n').map((line, index) => (
                    <div key={index} className={`p-1 ${!new RegExp(`^${generatedRegex}$`).test(line) ? 'bg-green-100' : 'bg-red-100'}`}>
                    {line} - {!new RegExp(`^${generatedRegex}$`).test(line) ? 'Does not match (Correct)' : 'Matches (Incorrect)'}
                    </div>
                ))
                ) : (
                <p className="text-gray-500">Enter &quot;Should Not Match&quot; test cases and generate a regex.</p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}

export default MainPage;
