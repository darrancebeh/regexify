# Re:Gex-ify - A Regex Generator

**Live Demo: [https://regexify.vercel.app/](https://regexify.vercel.app/)**

Re:Gex-ify is a web application designed to simplify the process of creating regular expressions. By providing examples of desired matches, and optionally, examples that should or should not match, users can intelligently generate complex regex patterns without needing to write them from scratch. The application features a user-friendly interface, a comprehensive user guide, and "Smart Syntax" (Hottips) for more direct regex construction.

## Key Features

*   **Intelligent Regex Generation**: Generates regex based on positive ("Desired Matches", "Should Match") and negative ("Should Not Match") examples.
*   **Smart Syntax / Hottips**: Allows users to use predefined placeholders (e.g., `{num}`, `{alpha:3,5}`, `{word+}`) in their input to directly influence regex construction for specific parts of their patterns.
*   **Email Pattern Specialization**: Includes specialized logic for accurately generalizing email address components (username, domain, TLD).
*   **Real-time Regex Tester**: Users can immediately test the generated regex against sample text.
*   **Comprehensive User Guide**: An in-app modal explains all features, including how to use Smart Syntax and tips for best results.
*   **Vercel Serverless Compatibility**: The backend API is designed to run efficiently on Vercel's serverless infrastructure.
*   **Responsive UI**: Built with Next.js, React, and Tailwind CSS for a modern and responsive user experience.
*   **Contradiction Handling**: Detects and flags contradictions if "Should Not Match" examples directly conflict with the generated regex.

## How to Use

1.  **Desired Matches (Required)**: Enter an exact example of the text you want your regex to match. This is the primary input. You can use Smart Syntax here.
2.  **Should Match Test Cases (Optional)**: Provide additional examples (one per line) that the final regex *must* match. This helps in generalizing the pattern, especially if "Desired Matches" is a literal string.
3.  **Should Not Match Test Cases (Optional)**: Provide examples (one per line) that the final regex *must not* match. This helps refine the pattern and exclude unwanted matches. You can use Smart Syntax here.
4.  Click **"Generate Regex"**.
5.  The application will display the generated regex and an explanation.
6.  Use the **"Real-time Regex Tester"** to validate the regex against your own text.
7.  Refer to the **"User Guide"** (accessible via a button on the main page) for detailed instructions, especially on using Smart Syntax.

## Smart Syntax / Hottips

A powerful feature of Re:Gex-ify is "Smart Syntax" or "Hottips". Users can embed placeholders within their "Desired Matches" or "Should Not Match" inputs to specify common patterns or apply quantifiers.

**Examples:**

*   `User{num+}`: Matches "User" followed by one or more numbers (e.g., "User123").
*   `{alpha:3,5}`: Matches 3 to 5 alphabetic characters.
*   `{word?}`: Matches zero or one word character.

For a full list of available Smart Syntax keys and quantifiers, please refer to the in-app User Guide.

## Tech Stack

*   **Frontend**: Next.js, React, TypeScript, Tailwind CSS
*   **Backend**: Next.js API Routes (TypeScript), Vercel Serverless Functions
*   **Core Logic**: Custom regex generation and generalization algorithms.

## Getting Started

To run this project locally:

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd regexify 
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    # yarn install
    # or
    # pnpm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    # or
    # yarn dev
    # or
    # pnpm dev
    ```
4.  Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

The main page can be found at `src/app/page.tsx`, which uses the `src/components/MainPage.tsx` component. The regex generation API is located at `src/app/api/generate-regex/route.ts`.

## API Endpoint

*   `POST /api/generate-regex`
    *   **Request Body** (JSON):
        ```json
        {
          "desiredMatches": "string", // Required
          "shouldMatch": ["string"],  // Optional
          "shouldNotMatch": ["string"] // Optional
        }
        ```
    *   **Response Body** (JSON):
        ```json
        {
          "generatedRegex": "string",
          "regexExplanation": "string"
        }
        ```
        Or in case of an error:
        ```json
        {
          "error": "string" 
        }
        ```

## Future Enhancements (Potential)

*   Support for more complex Smart Syntax options (e.g., character sets, groups).
*   Visual regex builder/editor.
*   Saving and sharing generated regex patterns.
*   User accounts and history.
*   More sophisticated generalization across multiple "Should Match" examples.

## Contributing

Contributions are welcome! If you have suggestions or find a bug, please open an issue or submit a pull request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information (if a LICENSE file is added).

---

This project was bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) and utilizes [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) for optimized font loading (Geist).
