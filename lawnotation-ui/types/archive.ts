export type DocFormat = "text/plain" | "text/html"

export type Doc = {
    name: string;
    format: DocFormat;
    content: string;
}