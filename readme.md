# Wishgranter Website
Wishgranter.dev uses a custom site builder built on top of Showdown because the person who made it likes it that way.
## `.level`
`.level` files are processed down the file tree, html first (eg. `/.level.html` will be proccesed before `/.level.ts` which will be proccessed before `/folder/.level.html`)
### `.level.html`
When a file has a `.level.html` file in the same directory or a parent directory, any html tags that are direct children of `<head>` or `<body>` in `.level.html` will be added below other tags added this way but above page content.
Exceptions:
* `<footer>`s are put below page content and above all other footers.
* `<header>`s are put directly below all other headers.
* `<title>` will not be copied.
### `.level.ts`
When a file has a `.level.ts` file in the same directory or a parent directory, it must return a function that takes a `Document` as a paramater which will be called by the builder.

