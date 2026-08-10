import { existsSync, statfsSync, statSync } from "node:fs";
import path, { join } from "node:path";
import { JSDOM } from "jsdom";
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

export const out_path = "public";
export const scripts_path = "dist";
export const working_path = "src";

if (import.meta.main) {
    build();
}

async function build() {
    const url_stack: `${string}/${string}`[] = ["/"];
    const processed_files = new Set<`${string}/${string}.${string}`>();
    while (url_stack.length > 0) {
        const url = url_stack.pop();
        if (url == undefined) return;
        const [input_file_path, output_file_path] = localUrlToFilePath(url);

        // Make sure destination directory exists
        if (output_file_path.match(/\.(?:html)|(?:js(?:\.map)?)$/))
            await mkdir(
                output_file_path.replace(
                    /(?<=\/)(?<=\w+)|(?:index)\.(?:html)|(?:js(?:\.map)?)$/,
                    "",
                ),
                {
                    recursive: true,
                },
            );

        if (processed_files.has(output_file_path)) {
            continue;
        } else if (existsSync(input_file_path)) {
            if (
                input_file_path.endsWith(".html") ||
                input_file_path.endsWith(".md")
            ) {
                console.log("Writing", output_file_path);
                const html = await renderHtml(input_file_path);
                await writeFile(output_file_path, html);
                url_stack.push(...getLinksFromHtml(html));
            } else {
                console.log("Copying", input_file_path, "to", output_file_path);
                await copyFile(input_file_path, output_file_path);
            }
            processed_files.add(output_file_path);
        }
    }
}

export function localUrlToFilePath(
    url: `${string}/${string}${".md" | ".html" | `${string}`}`,
): [`${string}/${string}.${"md" | "html"}`, `${string}/index.html`];
export function localUrlToFilePath(
    url: `${string}/${string}.js`,
): [`${string}/${string}.js`, `${string}/${string}.js`];
export function localUrlToFilePath(
    url: `${string}/${string}.${string}`,
): [`${string}/${string}.${string}`, `${string}/${string}.${string}`];
export function localUrlToFilePath(
    url: `${string}/${string}`,
): [`${string}/${string}.${string}`, `${string}/${string}.${string}`] {
    if (url.match(/\.js(?:.map)?$/)) {
        if (existsSync(path.join(scripts_path, url)))
            return [
                path.join(scripts_path, url) as `${string}/${string}.js`,
                path.join(out_path, url) as `${string}/${string}.js`,
            ];
        else if (existsSync(join(".", url)))
            return [
                join(".", url) as `${string}/${string}.js`,
                path.join(out_path, url) as `${string}/${string}.js`,
            ];
        else throw new ReferenceError(`${url} not found`);
    } else if (!url.match(/\/[\w-]*((.html)|(.md)|.|)$/)) {
        if (existsSync(path.join(working_path, url)))
            return [
                path.join(working_path, url) as `${string}/${string}.${string}`,
                path.join(out_path, url) as `${string}/${string}.${string}`,
            ];
        else throw new ReferenceError(`${url} not found`);
    } else {
        if (
            existsSync(path.join(working_path, url)) &&
            !statSync(path.join(working_path, url)).isDirectory()
        ) // Direct refrence
        {
            console.warn("Url to direct html refrence", url, "!");
            return [
                path.join(
                    working_path,
                    url,
                ) as `${string}/${string}.${"html" | "md"}`,
                path.join(out_path, url) as `${string}/${string}.html`,
            ];
        } else if (
            existsSync(path.join(working_path, url.replace(/\.html/, ".md"))) &&
            !statSync(
                path.join(working_path, url.replace(/\.html/, ".md")),
            ).isDirectory()
        ) {
            // Direct refrence to built page
            console.warn("Url to direct md refrence", url, "!");
            return [
                path.join(
                    working_path,
                    url.replace(/\.html/, ".md"),
                ) as `${string}/${string}.md`,
                path.join(out_path, url) as `${string}/${string}.html`,
            ];
        } else if (existsSync(path.join(working_path, url + ".html")))
            return [
                path.join(
                    working_path,
                    url + ".html",
                ) as `${string}/${string}.html`,
                path.join(
                    out_path,
                    url,
                    "index.html",
                ) as `${string}/index.html`,
            ];
        else if (existsSync(path.join(working_path, url + ".md")))
            return [
                path.join(
                    working_path,
                    url + ".md",
                ) as `${string}/${string}.md`,
                path.join(
                    out_path,
                    url,
                    "index.html",
                ) as `${string}/index.html`,
            ];
        else if (existsSync(path.join(working_path, url, "index.html")))
            return [
                path.join(
                    working_path,
                    url,
                    "index.html",
                ) as `${string}/index.html`,
                path.join(
                    out_path,
                    url,
                    "index.html",
                ) as `${string}/index.html`,
            ];
        else if (existsSync(path.join(working_path, url, "index.md")))
            return [
                path.join(
                    working_path,
                    url,
                    "index.md",
                ) as `${string}/index.md`,
                path.join(
                    out_path,
                    url,
                    "index.html",
                ) as `${string}/index.html`,
            ];
        else throw new ReferenceError(`${url} not found`);
    }
}

export async function renderHtml(
    file_path: `${string}/${string}.${"html" | "md"}`,
): Promise<string> {
    let file = await readFile(file_path, "utf8");
    if (file_path.endsWith(".md")) {
        file = micromark(file, {
            allowDangerousHtml: true,
            extensions: [gfm()],
            htmlExtensions: [gfmHtml()],
        });
    }
    const { document } = new JSDOM(file, { runScripts: "dangerously" }).window;
    await addLevelFiles(document, file_path);
    return `<!doctype html>\n${document.documentElement.innerHTML}`;
}

function getLinksFromHtml(html: string): Iterable<`${string}/${string}`> {
    const { document } = new JSDOM(html).window;
    return Array.from(document.getElementsByTagName("script"))
        .map((element) => element.getAttribute("src"))
        .concat(
            Array.from(document.getElementsByTagName("img")).map((element) =>
                element.getAttribute("src"),
            ),
        )
        .concat(
            Array.from(document.getElementsByTagName("link")).map((element) =>
                element.getAttribute("href"),
            ),
        )
        .concat(
            Array.from(document.getElementsByTagName("a")).map((element) =>
                element.getAttribute("href"),
            ),
        )
        .filter(
            (url) => url && !url.startsWith("http"),
        ) as `${string}/${string}`[];
}

async function addLevelFiles(document: Document, file_path: string) {
    const directory_names = file_path.split("/");
    let last_footer_element = undefined;
    let first_true_body_element = document.body.firstChild;
    let first_added_body_element = undefined;
    for (
        let directory_names_index = 1;
        directory_names_index < directory_names.length;
        directory_names_index++
    ) {
        const level_html_file_path = join(
            directory_names
                .slice(0, directory_names_index)
                .reduce((file_path, name) => join(file_path, name)),
            "/.level.html",
        );
        const level_js_file_path = join(
            directory_names
                .slice(1, directory_names_index)
                .reduce(
                    (file_path, name) => join(file_path, name),
                    scripts_path,
                ),
            ".level.js",
        );

        if (existsSync(level_html_file_path)) {
            const level_document = new JSDOM(
                await readFile(level_html_file_path),
                {
                    runScripts: "dangerously",
                },
            ).window.document;
            for (const child of level_document.head.children) {
                if (!["TITLE"].includes(child.tagName)) {
                    document.head.append(child.cloneNode(true));
                }
            }
            for (const child of level_document.body.children) {
                const element = child.cloneNode(true);
                if (child.tagName == "HEADER") {
                    document.body.insertBefore(
                        element,
                        first_added_body_element ?? first_true_body_element,
                    );
                } else if (child.tagName == "FOOTER") {
                    if (last_footer_element) {
                        document.body.insertBefore(
                            element,
                            last_footer_element,
                        );
                    } else {
                        document.body.append(element);
                    }
                    last_footer_element = element;
                } else {
                    if (first_true_body_element)
                        document.body.insertBefore(
                            element,
                            first_true_body_element,
                        );
                    else {
                        document.body.append(element);
                        console.error("No Content");
                    }

                    if (!first_added_body_element)
                        first_added_body_element = element;
                }
            }
        }
        if (existsSync(level_js_file_path)) {
            const level_url = directory_names
                .slice(1, directory_names_index)
                .reduce((file_path, name) => `${file_path}/${name}`, "");
            await (
                await import("../" + level_js_file_path)
            ).default(document, level_url);
        }
    }
}
