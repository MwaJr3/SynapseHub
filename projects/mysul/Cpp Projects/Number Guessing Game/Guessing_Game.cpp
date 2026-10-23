#include <iostream>
#include <cstdlib> //For rand() and srand ()
#include <ctime> //For time()
#include <limits> //For input validation

using namespace std;

// Function to clear input buffer
void clearInputBuffer (){
    cin.clear();
    cin.ignore(numeric_limits<streamsize>::max(), '\n');
}

// Function to clear console screen (platform-dependent)
void clearScreen(){
    #ifdef _WIN32
        system("cls"); // Windows
    #else
        system("clear"); // Unix-based (Linux, macOS)
    #endif
}

// Function to play one round of the guessing game
void playGame() {
    // Seed random number generator
    srand(static_cast<unsigned int>(time(0)));
    int secretNumber = rand() % 100 + 1; // Random number between 1 and 100
    int guess;
    int attempts = 0;
    bool hasWon = false;

    cout << "Welcome to the Number Guessing Game!\n";
    cout << "I'm thinking of a number between 1 and 100.\n";

    while (!hasWon) {
        cout << "\nEnter your guess: ";
        cin >> guess;
        attempts++;

        // Input validation
        if (cin.fail() || guess < 1 || guess > 100) {
            cout << "Invalid input! Please enter a number between 1 and 100.\n";
            clearInputBuffer();
            continue;
        }

        // Check guess
        if (guess == secretNumber) {
            cout << "Congratulations! You guessed the number in " << attempts << " attempts!\n";
            hasWon = true;
        } else if (guess > secretNumber) {
        cout << "Too high! Try again.";
        } else {
            cout << "Too low! Try again.";
        }
    }
}

int main(){
    char playAgain;

    do {
        clearScreen(); // Clear console for new game
        playGame(); // Play one round

        // Ask to play again
        cout << "\nWould you like to play again? (y/n): ";
        clearInputBuffer();
        cin >> playAgain;

        // Validate play again input
        while (cin.fail() || (playAgain != 'y' && playAgain != 'Y' && playAgain != 'n' && playAgain != 'N')){
            cout << "Invalid input! Please enter 'y' or 'n': ";
            clearInputBuffer();
            cin >> playAgain;
        }
    } while (playAgain == 'y' || playAgain == 'Y');

    cout << "Thanks for playing! Goodbye.\n";
    return 0;
}
