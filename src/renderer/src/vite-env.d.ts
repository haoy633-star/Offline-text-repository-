/// <reference types="vite/client" />

import type { ComicShelfApi } from "../../preload";

declare global {
  interface Window {
    comicShelf: ComicShelfApi;
  }
}
