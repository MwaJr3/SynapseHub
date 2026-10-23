#include <iostream>
using namespace std;
int main()
{
    int n;
    cout << "Enter a positive integer: ";
    cin >> n;
    if (n <= 1)
    {
        cout << n << " is not a prime number.\n";
        return 0;
    }
    bool isPrime = true;
    for (int i = 2; i * i <= n; ++i)
    {
        if (n % i == 0)
        {
            isPrime = false;
            break;
        }
        cout << n << (isPrime ? " is a prime number.\n" : " is not a prime number.\n");
    }
}