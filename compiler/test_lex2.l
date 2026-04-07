%{
#include <stdio.h>
#include <string.h>
int line_num = 1;
void log_msg(const char *msg) {
    fprintf(stderr, "[Line %d] %s\n", line_num, msg);
}
%}
%option noyywrap
%%
[a-zA-Z_][a-zA-Z0-9_]*  { printf("%s", yytext); }
[0-9]+(\.[0-9]+)?       { printf("%s", yytext); }
\"([^\\\"]|\\.)*\"      { printf("%s", yytext); }
\'([^\\\']|\\.)*\'      { printf("%s", yytext); }
[ \t]+                  { printf("%s", yytext); }
[+\-*/%=!<>|&^~()\[\]{};:,\.] { printf("%s", yytext); }
\n { printf("\n"); line_num++; }
. {
    char msg[256];
    sprintf(msg, "Lexical error: Unrecognized token '%s'", yytext);
    log_msg(msg);
    printf("%s", yytext);
}
%%
int main() { yylex(); return 0; }
