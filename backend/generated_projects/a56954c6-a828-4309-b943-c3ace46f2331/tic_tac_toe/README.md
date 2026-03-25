# Tic Tac Toe

A simple command-line Tic Tac Toe game implemented in Python.

## Project Structure

```
tic_tac_toe/
├── app.py
├── requirements.txt
├── README.md
└── utils/
    └── helpers.py
```

## How to Run

1.  **Clone the repository (or create the files manually):**
    ```bash
    # If you were cloning, for example:
    # git clone <repository_url>
    # cd tic_tac_toe
    ```
    For this project, you will create the files based on the provided JSON structure.

2.  **Navigate to the project directory:**
    ```bash
    cd tic_tac_toe
    ```

3.  **Install dependencies (if any):**
    This project has no external dependencies beyond standard Python libraries.
    ```bash
    # pip install -r requirements.txt
    ```
    (This command is not strictly necessary for this project as `requirements.txt` is empty)

4.  **Run the game:**
    ```bash
    python app.py
    ```

## How to Play

1.  The game board is displayed with numbers representing positions 1 through 9.
    ```
     1 | 2 | 3
    ---+---+---
     4 | 5 | 6
    ---+---+---
     7 | 8 | 9
    ```
    (Note: The actual game board will show ' ' for empty spaces during gameplay.)

2.  Players 'X' and 'O' take turns.
3.  When prompted, enter a number from 1 to 9 to place your mark on the corresponding position.
4.  The first player to get three of their marks in a row (horizontally, vertically, or diagonally) wins.
5.  If all 9 squares are filled and no player has won, the game is a draw.

Enjoy playing!
