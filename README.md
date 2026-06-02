# Offline Comic Shelf

Offline Comic Shelf is a local-first desktop comic library and reader for Windows. It is designed for people who keep comics on their own computer and want faster browsing than Windows Explorer can provide.

## Features

- Import comic folders as offline books.
- Import `.cbz` and `.zip` comic archives.
- Generate a visual shelf from the first page of each book.
- Search by title or source path.
- Read comics locally with keyboard navigation.
- Remember the last page for every comic.
- Remove books from the app library without deleting the original files.

## Supported Formats

Folder imports support common image files:

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`
- `.gif`
- `.bmp`
- `.avif`

Archive imports support:

- `.cbz`
- `.zip`

## Development

Install dependencies:

```bash
npm install
```

Run the app in development mode:

```bash
npm run dev
```

Build the app:

```bash
npm run build
```

Create a Windows installer:

```bash
npm run dist
```

## Notes

The app keeps its library index in Electron's user data directory. Imported folders are referenced in place, while imported CBZ files are extracted into the app cache so they can be displayed quickly.

## Roadmap

- Add metadata editing and tags.
- Add more reading modes, such as double-page view and vertical scroll.
- Add duplicate detection.
- Add thumbnail cache generation for very large libraries.
- Add CBR support through an optional native extractor.

## License

MIT
