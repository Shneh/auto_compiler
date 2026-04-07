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
^[ \t]*"#"([ \t]*)[a-zA-Z]+ {
    char directive[100];
    char *p = strchr(yytext, '#');
    p++;
    while(*p == ' ' || *p == '\t') p++;
    sscanf(p, "%[a-zA-Z]", directive);
    
    if (strcmp(directive, "include") != 0 && strcmp(directive, "define") != 0 && strcmp(directive, "pragma") != 0 && strcmp(directive, "ifndef") != 0 && strcmp(directive, "endif") != 0 && strcmp(directive, "ifdef") != 0 && strcmp(directive, "if") != 0 && strcmp(directive, "else") != 0 && strcmp(directive, "elif") != 0 && strcmp(directive, "undef") != 0 && strcmp(directive, "error") != 0 && strcmp(directive, "warning") != 0) {
        char msg[256];
        sprintf(msg, "Error: Invalid preprocessor directive '#%s'.", directive);
        log_msg(msg);
    }
    printf("%s", yytext);
}
\n { printf("\n"); line_num++; }
. { printf("%s", yytext); }
%%
int main() { yylex(); return 0; }
