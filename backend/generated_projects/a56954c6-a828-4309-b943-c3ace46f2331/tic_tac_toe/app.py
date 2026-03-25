from utils.helpers import display_board

# Global variables for game state
board = [' ' for _ in range(9)]
current_player = 'X'
game_running = True
winner = None

def check_win(player):
    """Checks if the given player has won."""
    # Check rows
    for i in range(0, 9, 3):
        if board[i] == board[i+1] == board[i+2] == player:
            return True
    # Check columns
    for i in range(3):
        if board[i] == board[i+3] == board[i+6] == player:
            return True
    # Check diagonals
    if board[0] == board[4] == board[8] == player:
        return True
    if board[2] == board[4] == board[6] == player:
        return True
    return False

def check_draw():
    """Checks if the game is a draw (board is full and no winner)."""
    return ' ' not in board

def player_move(player):
    """Handles a single move for the current player."""
    global board
    while True:
        try:
            move = int(input(f"Player {player}, choose a position from 1-9: ")) - 1
            if 0 <= move <= 8 and board[move] == ' ':
                board[move] = player
                return
            else:
                print("Invalid move. Position already taken or out of range. Try again.")
        except ValueError:
            print("Invalid input. Please enter a number between 1 and 9.")

def switch_player():
    """Switches the current player."""
    global current_player
    if current_player == 'X':
        current_player = 'O'
    else:
        current_player = 'X'

def main():
    """Main game loop for Tic Tac Toe."""
    global game_running, winner, current_player

    print("Welcome to Tic Tac Toe!")
    display_board(board)

    while game_running:
        print(f"It's Player {current_player}'s turn.")
        player_move(current_player)
        display_board(board)

        if check_win(current_player):
            winner = current_player
            game_running = False
        elif check_draw():
            game_running = False
        else:
            switch_player()

    if winner:
        print(f"Congratulations! Player {winner} wins!")
    else:
        print("It's a draw!")
    print("Game Over!")

if __name__ == "__main__":
    main()
