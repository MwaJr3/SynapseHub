#include <iostream>
using namespace std;
int main(){
    double num1, num2;
    char op;
    cout << "Enter two numbers: " << endl;
    cin >> num1 >> num2;
    cout << "Enter operator (+,-,*,/): " << endl;
    cin >> op;
    switch(op){
        case'+': cout << num1 + num2; break;
        case'-': cout << num1 - num2; break;
        case'*': cout << num1 * num2; break;
        case'/': if (num2 != 0) cout << num1 / num2; else cout << "Error: Division by zero"; break;
        default: cout << "Invalid operator";
    }
return 0;}
