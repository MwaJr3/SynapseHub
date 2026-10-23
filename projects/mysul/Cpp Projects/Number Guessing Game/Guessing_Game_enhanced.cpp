#include <iostream>
#include <cstdlib>  // For rand() and srand()
#include <ctime>    // For time()
#include <limits>   // For input validation
#include <fstream>  // For file I/O
#include <vector>   // For storing high scores
#include <algorithm> // For sorting high scores

using namespace std;

// Function to clear input buffer
void clearInputBuffer() {
    cin.clear();
    cin.ignore(numeric_limits<streamsize>::max(), '\n');
}

// Function to clear console screen (platform-dependent)
void clearScreen() {
#ifdef _WIN32
    system("cls"); // Windows
#else
    system("clear"); // Unix-based (Linux, macOS)
#endif
}

// Function to get valid integer input within a range
int getValidInput(int min, int max, const string& prompt) {
    int input;
    while (true) {
        cout << prompt;
        cin >> input;
        if (cin.fail() || input < min || input > max) {
            cout << "Invalid input! Please enter a number between " << min << " and " << max << ".\n";
            clearInputBuffer();
        } else {
            clearInputBuffer();
            return input;
        }
    }
}

// Function to load high scores from file
vector<int> loadHighScores(const string& difficulty) {
    vector<int> scores;
    ifstream inFile("highscores.txt");
    string line;
    while (getline(inFile, line)) {
        if (line.find(difficulty + ":") == 0) {
            line = line.substr(difficulty.length() + 1);
            size_t pos = 0;
            while (pos < line.length()) {
                size_t next = line.find(',', pos);
                if (next == string::npos) next = line.length();
                scores.push_back(stoi(line.substr(pos, next - pos)));
                pos = next + 1;
                if (scores.size() >= 3) break; // Limit to top 3
            }
            break;
        }
    }
    inFile.close();
    sort(scores.begin(), scores.end()); // Sort ascending
    return scores;
}

// Function to save high scores to file
void saveHighScores(const string& difficulty, int newScore) {
    vector<int> scores = loadHighScores(difficulty);
    scores.push_back(newScore);
    sort(scores.begin(), scores.end());
    if (scores.size() > 3) scores.resize(3); // Keep only top 3

    // Read all existing scores for other difficulties
    vector<string> allLines;
    ifstream inFile("highscores.txt");
    string line;
    bool updated = false;
    while (getline(inFile, line)) {
        if (line.find(difficulty + ":") == 0) {
            line = difficulty + ":";
            for (size_t i = 0; i < scores.size(); ++i) {
                line += to_string(scores[i]) + (i < scores.size() - 1 ? "," : "");
            }
            updated = true;
        }
        allLines.push_back(line);
    }
    inFile.close();

    if (!updated) {
        line = difficulty + ":";
        for (size_t i = 0; i < scores.size(); ++i) {
            line += to_string(scores[i]) + (i < scores.size() - 1 ? "," : "");
        }
        allLines.push_back(line);
    }

    // Write back to file
    ofstream outFile("highscores.txt");
    for (const auto& l : allLines) {
        outFile << l << endl;
    }
    outFile.close();
}

// Function to display high scores
void displayHighScores(const string& difficulty) {
    vector<int> scores = loadHighScores(difficulty);
    cout << "\nTop Scores for " << difficulty << ":\n";
    if (scores.empty()) {
        cout << "No scores yet.\n";
    } else {
        for (size_t i = 0; i < scores.size(); ++i) {
            cout << i + 1 << ". " << scores[i] << " attempts\n";
        }
    }
}

// Function to play one round of the guessing game
void playGame(int minRange, int maxRange, int maxAttempts, const string& difficulty) {
    // Seed random number generator
    srand(static_cast<unsigned int>(time(0)));
    int secretNumber = rand() % (maxRange - minRange + 1) + minRange;
    int guess;
    int attempts = 0;
    bool hasWon = false;

    cout << "\nWelcome to the Number Guessing Game!\n";
    cout << "I'm thinking of a number between " << minRange << " and " << maxRange << ".\n";
    cout << "You have " << maxAttempts << " attempts.\n";

    while (attempts < maxAttempts && !hasWon) {
        guess = getValidInput(minRange, maxRange, "Enter your guess: ");
        attempts++;

        if (guess == secretNumber) {
            cout << "Congratulations! You guessed the number in " << attempts << " attempts!\n";
            hasWon = true;
            saveHighScores(difficulty, attempts);
            displayHighScores(difficulty);
        } else if (guess > secretNumber) {
            cout << "Too high! " << (maxAttempts - attempts) << " attempts left.\n";
        } else {
            cout << "Too low! " << (maxAttempts - attempts) << " attempts left.\n";
        }
    }

    if (!hasWon) {
        cout << "Game Over! The number was " << secretNumber << ".\n";
        displayHighScores(difficulty);
    }
}

int main() {
    char playAgain;

    do {
        clearScreen();
        cout << "Number Guessing Game\n";
        cout << "1. Easy (1-100, 10 attempts)\n";
        cout << "2. Medium (1-500, 8 attempts)\n";
        cout << "3. Hard (1-1000, 6 attempts)\n";
        cout << "4. Custom Range\n";

        int choice = getValidInput(1, 4, "Select difficulty (1-4): ");
        int minRange, maxRange, maxAttempts;
        string difficulty;

        switch (choice) {
            case 1:
                minRange = 1;
                maxRange = 100;
                maxAttempts = 10;
                difficulty = "Easy";
                break;
            case 2:
                minRange = 1;
                maxRange = 500;
                maxAttempts = 8;
                difficulty = "Medium";
                break;
            case 3:
                minRange = 1;
                maxRange = 1000;
                maxAttempts = 6;
                difficulty = "Hard";
                break;
            case 4:
                minRange = getValidInput(1, 1000000, "Enter minimum range (1 or higher): ");
                maxRange = getValidInput(minRange + 1, 1000000, "Enter maximum range (> min): ");
                maxAttempts = getValidInput(1, 100, "Enter max attempts: ");
                difficulty = "Custom";
                break;
        }

        displayHighScores(difficulty);
        playGame(minRange, maxRange, maxAttempts, difficulty);

        cout << "\nWould you like to play again? (y/n): ";
        cin >> playAgain;
        while (cin.fail() || (playAgain != 'y' && playAgain != 'Y' && playAgain != 'n' && playAgain != 'N')) {
            cout << "Invalid input! Please enter 'y' or 'n': ";
            clearInputBuffer();
            cin >> playAgain;
        }

    } while (playAgain == 'y' || playAgain == 'Y');

    cout << "Thanks for playing! Goodbye.\n";
    return 0;
}
