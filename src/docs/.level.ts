import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { working_path } from "../build.ts";

export default async function (
    document: Document,
    level_url: string,
): Promise<void> {
    await addFilesToMenu(
        document,
        level_url,
        document.getElementById("docs-menu") as HTMLElement,
    );
}

async function addFilesToMenu(
    document: Document,
    directory_url: string,
    menu_parent: HTMLElement,
) {
    const directory_path = join(working_path, directory_url);
    const menu = document.createElement("menu");

    for (const path of await readdir(directory_path)) {
        const is_directory =
            (await stat(join(directory_path, path))).isDirectory() &&
            !path.startsWith(".");
        const is_link =
            (is_directory &&
                (existsSync(join(directory_path, path, "index.html")) ||
                    existsSync(join(directory_path, path, "index.md")))) ||
            (!path.match(/^(?:\.)|(?:index)/) &&
                path.match(/\.(?:html)|(?:md)$/));

        if (!is_link && !is_directory) continue;

        const element = document.createElement("li");
        const label = document.createElement(is_link ? "a" : "p");

        let clean_path = path.replaceAll(/\.(?:(?:html)|(?:md)|[])/g, "");
        if (is_link) {
            (label as HTMLAnchorElement).href = join(
                "",
                directory_url,
                clean_path,
            );
        }
        clean_path = clean_path.replaceAll(/-/g, " ");
        label.textContent = clean_path[0]?.toUpperCase() + clean_path.slice(1);
        element.append(label);

        if (
            is_directory &&
            !(
                (await readdir(join(directory_path, path))).length == 1 &&
                (existsSync(join(directory_path, path, "index.html")) ||
                    existsSync(join(directory_path, path, "index.md")))
            )
        ) {
            await addFilesToMenu(document, join(directory_url, path), element);
        }

        menu.append(element);
    }
    menu_parent.append(menu);
}
