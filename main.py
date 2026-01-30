"""
Main entry point for the application.
"""


def greet(name: str) -> str:
    """Return a greeting message for the given name."""
    return f"Hello, {name}! Welcome to test-repo."


def add(a: int, b: int) -> int:
    """Add two numbers and return the result."""
    return a + b


def main():
    """Main function to demonstrate the application."""
    print(greet("World"))

    result = add(5, 3)
    print(f"5 + 3 = {result}")


if __name__ == "__main__":
    main()
