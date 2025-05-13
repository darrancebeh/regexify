'use client';
import React, { useState } from 'react';

function MainPage() {
  const [sampleText, setSampleText] = useState('');
  const [desiredMatches, setDesiredMatches] = useState('');
  const [shouldMatch, setShouldMatch] = useState('');
  const [shouldNotMatch, setShouldNotMatch] = useState('');
  const [generatedRegex, setGeneratedRegex] = useState('');
  const [regexExplanation, setRegexExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUserGuideModal, setShowUserGuideModal] = useState(false);

  const handleGenerateRegex = async () => {
    if (!desiredMatches.trim()) {
      setGeneratedRegex('');
      setRegexExplanation('Please enter desired matches to generate a regex.');
      setError('');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/generate-regex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          desiredMatches,
          shouldMatch: shouldMatch.split('\n').map(s => s.trim()).filter(s => s),
          shouldNotMatch: shouldNotMatch.split('\n').map(s => s.trim()).filter(s => s),
        }),
      });

      setIsLoading(false);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      setGeneratedRegex(data.generatedRegex || '');
      setRegexExplanation(data.regexExplanation || 'No explanation provided.');

    } catch (err) {
      setIsLoading(false);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`${errorMessage}`);
      setRegexExplanation(`Error: ${errorMessage}`);
      console.error("Error calling generate-regex API:", err);
    }
  };

  const UserGuideModal = () => {
    const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        setShowUserGuideModal(false);
      }
    };

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full flex flex-col max-h-[90vh]">
          {/* Sticky Header */}
          <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg z-10">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Re:Gex-ify User Guide</h2>
            <button 
              onClick={() => setShowUserGuideModal(false)} 
              className="text-gray-500 hover:text-gray-700 text-2xl font-semibold p-1 -mr-1 rounded-full hover:bg-gray-100"
              aria-label="Close user guide"
            >
              &times;
            </button>
          </div>
          
          {/* Scrollable Content */}
          <div className="text-gray-700 space-y-3 text-sm md:text-base p-4 md:p-6 overflow-y-auto flex-grow">
            <p className="font-semibold">Welcome to <strong>Re:Gex-ify</strong>, your intelligent assistant for crafting regular expressions!</p>

            <h3 className="text-lg font-semibold mt-4 text-gray-800">1. What is Re:Gex-ify?</h3>
            <p>Re:Gex-ify helps you generate regular expressions (regex) by understanding your examples. Instead of writing complex regex syntax from scratch, you provide text samples, and Re:Gex-ify suggests a pattern.</p>

            <h3 className="text-lg font-semibold mt-4 text-gray-800">2. How to Use Re:Gex-ify:</h3>
            <p>The interface has a few key input fields:</p>
            <ul className="list-disc list-inside space-y-2 pl-4">
              <li>
                <strong>Sample Text (Optional but Recommended):</strong>
                <ul className="list-circle list-inside pl-4 space-y-1 text-xs md:text-sm">
                  <li><strong>Purpose:</strong> This is a larger piece of text where you want to find and highlight things that match your generated regex.</li>
                  <li><strong>Example:</strong> If you&apos;re trying to extract email addresses, you might paste a paragraph containing several emails here.</li>
                  <li><strong>Feedback:</strong> The &quot;Matches in Sample Text&quot; section will show you what parts of this text your current regex is highlighting.</li>
                </ul>
              </li>
              <li>
                <strong>Desired Matches (Required):</strong>
                <ul className="list-circle list-inside pl-4 space-y-1 text-xs md:text-sm">
                  <li><strong>Purpose:</strong> This is the most crucial input. Type or paste an exact example of what you want your regex to match. This is your primary instruction to the generator.</li>
                  <li><strong>Example:</strong> If you want to match email addresses like &quot;user@example.com&quot;, you would type <code>user@example.com</code> here.</li>
                </ul>
              </li>
              <li>
                <strong>Should Match Test Cases (Optional):</strong>
                <ul className="list-circle list-inside pl-4 space-y-1 text-xs md:text-sm">
                  <li><strong>Purpose:</strong> Provide additional examples (one per line) that your final regex <em>must</em> successfully match. This helps Re:Gex-ify understand variations and generalize the pattern.</li>
                  <li><strong>Example:</strong> If <code>Desired Matches</code> is <code>abc@gmail.com</code>, you could add <code>xyz@hotmail.com</code> and <code>123@sub.domain.co.uk</code> in &quot;Should Match Test Cases&quot;. Re:Gex-ify will try to create a regex that matches all these examples.</li>
                  <li><strong>Note:</strong> Currently, the generator heavily prioritizes the <em>first</em> &quot;Should Match&quot; example for detailed generalization.</li>
                </ul>
              </li>
              <li>
                <strong>Should Not Match Test Cases (Optional):</strong>
                <ul className="list-circle list-inside pl-4 space-y-1 text-xs md:text-sm">
                  <li><strong>Purpose:</strong> Provide examples (one per line) that your final regex <em>must not</em> match. This is useful for excluding specific cases or refining the pattern.</li>
                  <li><strong>Example:</strong> If your regex is trying to match all words except &quot;error&quot;, you might have <code>Desired Matches</code> as <code>warning</code>. You would put <code>error</code> in &quot;Should Not Match Test Cases&quot;.</li>
                </ul>
              </li>
            </ul>

            <h3 className="text-lg font-semibold mt-4 text-gray-800">3. Generating the Regex:</h3>
            <p>Once you&apos;ve filled in at least <code>Desired Matches</code>, click the <strong>&quot;Generate Regex&quot;</strong> button.</p>

            <h3 className="text-lg font-semibold mt-4 text-gray-800">4. Understanding the Output:</h3>
            <ul className="list-disc list-inside space-y-2 pl-4">
              <li><strong>Generated Regex:</strong> Displays the regex created. You can copy this.</li>
              <li><strong>Regex Explanation:</strong> Provides a brief explanation of the regex.</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4 text-gray-800">5. Real-time Feedback:</h3>
            <p>This section helps you test the generated regex instantly:</p>
            <ul className="list-disc list-inside space-y-2 pl-4">
              <li><strong>Matches in Sample Text:</strong> Highlights matches in your sample text.</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4 text-gray-800">6. Tips for Best Results:</h3>
            <ul className="list-disc list-inside space-y-2 pl-4">
              <li>Start simple with a clear <code>Desired Matches</code>.</li>
              <li>Iterate using &quot;Should Match&quot; and &quot;Should Not Match&quot; to refine.</li>
              <li>Be specific with your examples.</li>
              <li>Check explanations for clues.</li>
              <li>Re:Gex-ify has special logic for email patterns.</li>
              <li><strong>New:</strong> Use Smart Syntax (see section below) for more direct regex construction.</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4 text-gray-800">7. Smart Syntax / Hottips (New!):</h3>
            <p>You can use special placeholders (hottips) in the <code>Desired Matches</code> and <code>Should Not Match</code> fields to directly build more complex regex patterns. If a placeholder is not recognized, it will be treated as literal text. Text outside of <code>{'{'}...{'}'}</code> is always treated as literal.</p>
            <p>
              <strong>Note on Smart Syntax in &quot;Desired Matches&quot; vs. &quot;Should Match Test Cases&quot;:</strong>
            </p>
            <p>
              The &quot;Should Match Test Cases&quot; are primarily for helping Re:Gex-ify generalize when &quot;Desired Matches&quot; is a plain literal string (like <code>ORDER-12</code>). If you provide the generalization yourself using Smart Syntax in &quot;Desired Matches&quot;, that takes precedence. While &quot;Should Match Test Cases&quot; won&apos;t be used to <em>create</em> the regex in this mode, they remain useful for <em>testing</em> if the regex (built from your Smart Syntax) correctly matches these additional examples.
            </p>
            <p className="mt-2 font-semibold text-gray-700">Available Placeholders (Keys):</p>
            <ul className="list-disc list-inside space-y-1 pl-4 mt-1 text-xs md:text-sm">
              <li><code>{'{'}alpha{'}'}</code> - Matches any uppercase or lowercase alphabet letter (e.g., <code>a-z, A-Z</code>). Equivalent to <code>[a-zA-Z]</code>.</li>
              <li><code>{'{'}lower{'}'}</code> - Matches any lowercase alphabet letter (e.g., <code>a-z</code>). Equivalent to <code>[a-z]</code>.</li>
              <li><code>{'{'}upper{'}'}</code> - Matches any uppercase alphabet letter (e.g., <code>A-Z</code>). Equivalent to <code>[A-Z]</code>.</li>
              <li><code>{'{'}num{'}'}</code> or <code>{'{'}digit{'}'}</code> - Matches any digit (e.g., <code>0-9</code>). Equivalent to <code>\\d</code>.</li>
              <li><code>{'{'}alphanum{'}'}</code> - Matches any alphabet letter or digit. Equivalent to <code>[a-zA-Z0-9]</code>.</li>
              <li><code>{'{'}word{'}'}</code> - Matches any word character (alphanumeric plus underscore). Equivalent to <code>\\w</code>.</li>
              <li><code>{'{'}symbol{'}'}</code> - Matches common symbols (characters that are not letters, digits, or whitespace). Equivalent to <code>[^A-Za-z0-9\\s]</code>.</li>
              <li><code>{'{'}space{'}'}</code> or <code>{'{'}whitespace{'}'}</code> - Matches any whitespace character (space, tab, newline, etc.). Equivalent to <code>\\s</code>.</li>
              <li><code>{'{'}any{'}'}</code> - Matches any single character (except newline). Equivalent to <code>.</code>.</li>
              <li><code>{'{'}sol{'}'}</code> - Matches the start of a line. Equivalent to <code>^</code>.</li>
              <li><code>{'{'}eol{'}'}</code> - Matches the end of a line. Equivalent to <code>$</code>.</li>
            </ul>

            <h4 className="text-md font-semibold mt-3 text-gray-800">Using Quantifiers with Smart Syntax:</h4>
            <p className="text-xs md:text-sm">You can specify how many times a Smart Syntax placeholder should match by adding a quantifier. Replace <code>key</code> with any valid placeholder like <code>num</code>, <code>alpha</code>, etc. (e.g., <code>{'{'}num:2,4{'}'}</code>). The general forms are:</p>
            <ul className="list-disc list-inside space-y-1 pl-4 mt-1 text-xs md:text-sm">
              <li><code>{'{'}key:N{'}'}</code> - Matches the pattern for &apos;key&apos; exactly N times. Example: <code>{'{'}digit:3{'}'}</code> for three digits.</li>
              <li><code>{'{'}key:N,M{'}'}</code> - Matches &apos;key&apos; from N to M times. Example: <code>{'{'}alpha:2,5{'}'}</code> for two to five letters.</li>
              <li><code>{'{'}key:N,{'}'}</code> - Matches &apos;key&apos; N or more times. Example: <code>{'{'}word:3,{'}'}</code> for three or more word characters.</li>
              <li><code>{'{'}key?{'}'}</code> - Matches &apos;key&apos; zero or one time (optional). Equivalent to <code>{'{'}key:0,1{'}'}</code>. Example: <code>{'{'}symbol?{'}'}</code>.</li>
              <li><code>{'{'}key*{'}'}</code> - Matches &apos;key&apos; zero or more times. Equivalent to <code>{'{'}key:0,{'}'}</code>. Example: <code>{'{'}any*{'}'}</code>.</li>
              <li><code>{'{'}key+{'}'}</code> - Matches &apos;key&apos; one or more times. Equivalent to <code>{'{'}key:1,{'}'}</code>. Example: <code>{'{'}num+{'}'}</code>.</li>
            </ul>

            <p className="mt-2"><strong>Example Usage:</strong></p>
            <ul className="list-circle list-inside pl-4 space-y-1 text-xs md:text-sm">
              <li>Desired Matches: <code>User{'{'}num+{'}'}</code> with Should Match: <code>User123</code> would generalize to match <code>User</code> followed by one or more digits. (Regex: <code>User\\d+</code>)</li>
              <li>Should Not Match: <code>Error-{'{'}num+{'}'}</code> would prevent matching lines like <code>Error-5</code>, <code>Error-55</code>. (Regex: <code>(?!^Error-\\d+$)</code>)</li>
              <li>Using <code>{'{'}any*{'}'}</code>: If Desired Matches is <code>prefix_{'{'}any*{'}'}_suffix</code>, it will match lines like <code>prefix_abc_suffix</code> or <code>prefix__suffix</code>.</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-700">Real-time Regex Tester</h3>
          </div>

          {/* Sticky Footer */}
          <div className="p-4 md:p-6 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-lg z-10 text-right">
            <button 
              onClick={() => setShowUserGuideModal(false)} 
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors duration-150"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          Re:Gex-ify, a RegEx Generator.
          <span className="text-sm font-normal text-gray-500 ml-2">by db</span>
        </h1>
        <button 
          onClick={() => setShowUserGuideModal(true)}
          className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 font-semibold rounded-md hover:bg-gray-200 transition-colors duration-150 text-sm border border-gray-300 shadow-sm"
          title="Open User Guide"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          User Guide
        </button>
      </div>

      <div className="mb-4">
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
            placeholder="e.g., user@example.com, 192.168.1.1"
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

      <div className="my-4">
        <button
          onClick={handleGenerateRegex}
          disabled={isLoading || !desiredMatches.trim()}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-150"
        >
          {isLoading ? 'Generating...' : 'Generate Regex'}
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md border border-red-300">
          <p><strong className="font-semibold">Error:</strong> {error}</p>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-xl font-semibold">Generated Regex:</h2>
        <pre className="bg-gray-800 text-white p-3 rounded-md overflow-x-auto text-sm">
          {generatedRegex || (isLoading ? 'Loading...' : 'Click "Generate Regex" to see results.')}
        </pre>
        <p className="text-sm text-gray-600 mt-1 italic">{regexExplanation || (isLoading ? 'Fetching explanation...' : 'No explanation yet.')}</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold">Real-time Regex Tester:</h2>
        <div className="grid grid-cols-1 gap-4 mt-2">
            <div>
                <label htmlFor="sampleText" className="block text-sm font-medium text-gray-700">
                    Test Text:
                </label>
                <textarea
                    id="sampleText"
                    value={sampleText}
                    onChange={(e) => setSampleText(e.target.value)}
                    rows={5}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 min-h-32"
                    placeholder="Paste or type text here to test the generated regex against it..."
                />
            </div>
            <div>
                <h3 className="text-lg font-medium mt-3">Test Results:</h3>
                {generatedRegex ? (
                    sampleText.trim() ? (
                        <div className="bg-gray-100 text-gray-900 p-2 rounded-md border border-gray-300 min-h-[60px] space-y-1">
                            {sampleText.split('\n').map((line, index) => {
                                if (line.trim() === '' && index === sampleText.split('\n').length - 1 && sampleText.split('\n').length > 1) {
                                    // Handle case where the last line is empty due to a trailing newline, but not if it's the only line.
                                    return null;
                                }
                                let isMatch = false;
                                let matchError = '';
                                try {
                                    // Ensure the regex tests the whole line
                                    const regexToTest = new RegExp(`^(${generatedRegex})$`);
                                    isMatch = regexToTest.test(line);
                                } catch (e) {
                                    matchError = e instanceof Error ? e.message : "Invalid regex pattern";
                                }
                                return (
                                    <div key={index} className={`flex justify-between items-center p-1.5 rounded text-sm ${matchError ? 'bg-orange-100' : (isMatch ? 'bg-green-100' : 'bg-red-100')}`}>
                                        <span className="font-mono truncate pr-2" title={line}>{line.length > 70 ? `${line.substring(0, 67)}...` : line}</span>
                                        {matchError ? 
                                            <span className="text-orange-700 font-semibold">Error: {matchError}</span> :
                                            <span className={`font-semibold ${isMatch ? 'text-green-700' : 'text-red-700'}`}>
                                                {isMatch ? "Match!" : "No Match."}
                                            </span>
                                        }
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic p-2 border border-dashed rounded-md min-h-[60px] flex items-center justify-center">Enter text in the &quot;Test Text&quot; area above to see live results.</p>
                    )
                ) : (
                    <p className="text-gray-500 italic p-2 border border-dashed rounded-md min-h-[60px] flex items-center justify-center">Generate a regex first, then enter text above to test it.</p>
                )}
            </div>
        </div>
      </div>
      {showUserGuideModal && <UserGuideModal />}
    </div>
  );
}

export default MainPage;
