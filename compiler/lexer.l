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

  /* 1. Handling uninitialized declared variables like: int x; */
"int"[ \t]+[a-zA-Z_][a-zA-Z0-9_]*[ \t]*";" {
    char type[10];
    char var[100];
    sscanf(yytext, "%s %[^; \t]", type, var);
    printf("int %s = 0;", var);
    char msg[256];
    sprintf(msg, "Uninitialized integer '%s' found. Auto-initialized to 0.", var);
    log_msg(msg);
}

"float"[ \t]+[a-zA-Z_][a-zA-Z0-9_]*[ \t]*";" {
    char type[10];
    char var[100];
    sscanf(yytext, "%s %[^; \t]", type, var);
    printf("float %s = 0.0;", var);
    char msg[256];
    sprintf(msg, "Uninitialized float '%s' found. Auto-initialized to 0.0.", var);
    log_msg(msg);
}

"double"[ \t]+[a-zA-Z_][a-zA-Z0-9_]*[ \t]*";" {
    char type[10];
    char var[100];
    sscanf(yytext, "%s %[^; \t]", type, var);
    printf("double %s = 0.0;", var);
    char msg[256];
    sprintf(msg, "Uninitialized double '%s' found. Auto-initialized to 0.0.", var);
    log_msg(msg);
}

"char"[ \t]+[a-zA-Z_][a-zA-Z0-9_]*[ \t]*";" {
    char type[10];
    char var[100];
    sscanf(yytext, "%s %[^; \t]", type, var);
    printf("char %s = '\\0';", var);
    char msg[256];
    sprintf(msg, "Uninitialized char '%s' found. Auto-initialized to '\\0'.", var);
    log_msg(msg);
}

  /* 2. Incomplete Assignments */
  /* e.g. "int b= \n" */
^[ \t]*"int"[ \t]+[a-zA-Z_][a-zA-Z0-9_]*[ \t]*=[ \t]*\n {
    char linecpy[1024];
    strcpy(linecpy, yytext);
    linecpy[strlen(linecpy)-1] = '\0';
    printf("%s0;\n", linecpy);
    log_msg("Incomplete integer assignment. Added '0;'.");
    line_num++;
}

^[ \t]*("float"|"double")[ \t]+[a-zA-Z_][a-zA-Z0-9_]*[ \t]*=[ \t]*\n {
    char linecpy[1024];
    strcpy(linecpy, yytext);
    linecpy[strlen(linecpy)-1] = '\0';
    printf("%s0.0;\n", linecpy);
    log_msg("Incomplete float/double assignment. Added '0.0;'.");
    line_num++;
}

^[ \t]*[a-zA-Z_][a-zA-Z0-9_]*[ \t]*=[ \t]*\n {
    char linecpy[1024];
    strcpy(linecpy, yytext);
    linecpy[strlen(linecpy)-1] = '\0';
    printf("%s0;\n", linecpy);
    log_msg("Incomplete generic assignment. Added '0;'.");
    line_num++;
}

  /* 3. Missing Semicolons */
  /* e.g. "int a=x+b \n" (No semicolon before newline) */
^[ \t]*("int"|"float"|"double"|"char"|"long"|"short")[ \t]+[a-zA-Z_][a-zA-Z0-9_]*[ \t]*=[ \t]*[^;\n]+\n {
    char text[1024];
    strcpy(text, yytext);
    text[strlen(text)-1] = '\0'; /* Remove newline */
    printf("%s;\n", text);
    log_msg("Missing semicolon at the end of declaration. Added ';'.");
    line_num++;
}

^[ \t]*[a-zA-Z_][a-zA-Z0-9_]*[ \t]*=[ \t]*[^;\n]+\n {
    char text[1024];
    strcpy(text, yytext);
    text[strlen(text)-1] = '\0'; /* Remove newline */
    printf("%s;\n", text);
    log_msg("Missing semicolon at the end of assignment. Added ';'.");
    line_num++;
}

  /* 4. Missing Return Content & Semicolons */
  /* e.g. "return \n" */
^[ \t]*"return"[ \t]*\n {
    char linecpy[1024];
    strcpy(linecpy, yytext);
    linecpy[strlen(linecpy)-1] = '\0';
    
    // Add a space if it's missing before 0
    if (linecpy[strlen(linecpy)-1] != ' ' && linecpy[strlen(linecpy)-1] != '\t') {
        printf("%s 0;\n", linecpy);
    } else {
        printf("%s0;\n", linecpy);
    }
    
    log_msg("Incomplete return statement. Added '0;'.");
    line_num++;
}

  /* e.g. "return x+b \n" */
^[ \t]*"return"[ \t]+[^;\n]+\n {
    char text[1024];
    strcpy(text, yytext);
    text[strlen(text)-1] = '\0';
    printf("%s;\n", text);
    log_msg("Missing semicolon in return statement. Added ';'.");
    line_num++;
}

\n {
    printf("\n");
    line_num++;
}

. {
    printf("%s", yytext);
}

%%

int main(int argc, char **argv) {
    yylex();
    return 0;
}
