# Kids Maths

A private maths game for our family. Our own drawings. Not for sale.

- `index.html` and `art`, `art2`, `modules`, `topics`: the live game.
- `src`: the source. Build: `python src/integrate_topics.py` makes `src/kitty_world4.html`, then `python tests/wrap_like_publish.py src/kitty_world4.html index.html`.
- `tests`: silent browser checks. Each prints one line per check.
- `game`: the new two-child game (Marie in the cafe, Kennedy in the castle). It works offline after one visit (`game/sw.js`) and can be added to the home screen (`game/app.webmanifest`, `game/icons`).
  - After you change any file the game page loads, run `python tools/make_offline_files.py` (it rewrites the file list and version inside `game/sw.js`). `tests/game_new_skills_ui_test.py` fails if you forget.
  - Icons are drawn by `python tools/draw_app_icons.py`.
