# Footer emoji themes

Reference for the recap footer. The catalog itself lives in
`extensions/recap-footer/themes.ts`; this file explains it and shows every row.

Run `/footer-themes` in pi to preview them live.

## How a session picks its theme

`sha256(session_id) % 35` indexes the sorted theme list, so a conversation
keeps one visual identity for its whole life — across compaction, context loss,
and resume weeks later — with no stored state. Without `PI_SESSION_ID` the seed
falls back to the working directory, so at least each project stays consistent.

With 35 themes and a handful of windows open, occasional collisions are
expected; seed with `PI_SESSION_ID + cwd` if two windows in the same repo ever
need to be guaranteed different.

## Glyph rules (why rows never go ragged)

Every glyph must avoid all three of these, or it renders half-width and breaks
the row:

1. **U+FE0F variation selectors** — rules out ❤️, ⭐️, 🏖️, 🕹️, ⚙️ and friends.
2. **ZWJ sequences** — rules out ❤‍🔥, 🐈‍⬛.
3. **Text-default presentation** — rules out ❤, 🐿, 🏍, 🗂, 🖲, 🌶, 🏗.

Widths: emoji rules are **40 glyphs** (~80 columns, matching pi's `<hr>`, which
renders as `─` × min(width, 80)). Text waves are **80 characters**, since
braille and `∿` are single-width.

## Color

Emoji carry their own color. Text waves inherit theme tokens, so `braille-teal`
and `sinewave-teal` are wrapped in backticks to pick up `mdCode` (`#8abeb7` in
the dark theme); the plain variants render in body text color.

## Trains

`trains` is generated rather than repeated: 🚂 locomotive, 38 shuffled cars
(🚃 / 🚋), a ~7% chance per slot of a gag car (🐄 🚙 🛻 🎪), and a 🚗 red car as
the caboose. It re-randomizes on every render, so the train differs message to
message while the theme stays fixed.

## Inspecting

```bash
/footer-themes        # preview every theme and its row
/footer-themes bug    # filter by name
/footer-stamp         # stamp / theme / name / rule for this session
```

## The catalog

```
autumn
🍂🍁🌰🎃🦃🍄🧣🥧🍂🍁🌰🎃🦃🍄🧣🥧🍂🍁🌰🎃🦃🍄🧣🥧🍂🍁🌰🎃🦃🍄🧣🥧🍂🍁🌰🎃🦃🍄🧣🥧

beach
🌴🥥🐚🩴🌊🦀🏄🐠🌴🥥🐚🩴🌊🦀🏄🐠🌴🥥🐚🩴🌊🦀🏄🐠🌴🥥🐚🩴🌊🦀🏄🐠🌴🥥🐚🩴🌊🦀🏄🐠

blue
🔵🌊🐳🫐💧🐟🧊🟦💙🐋🔵🌊🐳🫐💧🐟🧊🟦💙🐋🔵🌊🐳🫐💧🐟🧊🟦💙🐋🔵🌊🐳🫐💧🐟🧊🟦💙🐋

braille
⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄

braille-teal
`⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄⣀⡠⠔⠊⠉⠑⠢⢄`

breakfast
🍳🥓🥞🧇🥐🥯🍞🥚🧈🥛🍳🥓🥞🧇🥐🥯🍞🥚🧈🥛🍳🥓🥞🧇🥐🥯🍞🥚🧈🥛🍳🥓🥞🧇🥐🥯🍞🥚🧈🥛

brown
🟤🟫🐻🍂🥔🌰🪵🍞🐴🦫🟤🟫🐻🍂🥔🌰🪵🍞🐴🦫🟤🟫🐻🍂🥔🌰🪵🍞🐴🦫🟤🟫🐻🍂🥔🌰🪵🍞🐴🦫

bugs
🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌

desert
🌵🐍🦂🌞🪨🐫🌾🥵🌵🐍🦂🌞🪨🐫🌾🥵🌵🐍🦂🌞🪨🐫🌾🥵🌵🐍🦂🌞🪨🐫🌾🥵🌵🐍🦂🌞🪨🐫🌾🥵

farm
🐮🐷🐔🐴🐑🐐🦆🦃🐄🐖🐮🐷🐔🐴🐑🐐🦆🦃🐄🐖🐮🐷🐔🐴🐑🐐🦆🦃🐄🐖🐮🐷🐔🐴🐑🐐🦆🦃🐄🐖

flowers
🌸🌺🌻🌷🌹🪷🌼💐🥀🪻🌸🌺🌻🌷🌹🪷🌼💐🥀🪻🌸🌺🌻🌷🌹🪷🌼💐🥀🪻🌸🌺🌻🌷🌹🪷🌼💐🥀🪻

forest
🌲🌳🌴🌵🎋🪵🍄🍂🦌🦉🌲🌳🌴🌵🎋🪵🍄🍂🦌🦉🌲🌳🌴🌵🎋🪵🍄🍂🦌🦉🌲🌳🌴🌵🎋🪵🍄🍂🦌🦉

fruit
🍎🍊🍋🍌🍉🍇🍓🍑🥭🍍🥝🍒🍎🍊🍋🍌🍉🍇🍓🍑🥭🍍🥝🍒🍎🍊🍋🍌🍉🍇🍓🍑🥭🍍🥝🍒🍎🍊🍋🍌

gems
💎💍👑🪙🏆🥇🧿🔮💎💍👑🪙🏆🥇🧿🔮💎💍👑🪙🏆🥇🧿🔮💎💍👑🪙🏆🥇🧿🔮💎💍👑🪙🏆🥇🧿🔮

green
🌿🍀🥬🥒🐸🌵🍃🥝🫑🐢🌲🥦🌿🍀🥬🥒🐸🌵🍃🥝🫑🐢🌲🥦🌿🍀🥬🥒🐸🌵🍃🥝🫑🐢🌲🥦🌿🍀🥬🥒

halloween
🎃👻💀🦇🧛🧟🧙🍬🎃👻💀🦇🧛🧟🧙🍬🎃👻💀🦇🧛🧟🧙🍬🎃👻💀🦇🧛🧟🧙🍬🎃👻💀🦇🧛🧟🧙🍬

hotdogs
🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭🌭

junkfood
🍔🍟🌭🍕🍩🍿🍫🍬🍭🧁🥤🍪🍔🍟🌭🍕🍩🍿🍫🍬🍭🧁🥤🍪🍔🍟🌭🍕🍩🍿🍫🍬🍭🧁🥤🍪🍔🍟🌭🍕

mono
⚫⚪🔘🖤🤍🩶🎱🐧⚫⚪🔘🖤🤍🩶🎱🐧⚫⚪🔘🖤🤍🩶🎱🐧⚫⚪🔘🖤🤍🩶🎱🐧⚫⚪🔘🖤🤍🩶🎱🐧

moon
🌑🌒🌓🌔🌕🌖🌗🌘🌑🌒🌓🌔🌕🌖🌗🌘🌑🌒🌓🌔🌕🌖🌗🌘🌑🌒🌓🌔🌕🌖🌗🌘🌑🌒🌓🌔🌕🌖🌗🌘

ocean
🐠🐟🐡🦈🐬🐳🐙🦑🦀🦞🐚🪸🐠🐟🐡🦈🐬🐳🐙🦑🦀🦞🐚🪸🐠🐟🐡🦈🐬🐳🐙🦑🦀🦞🐚🪸🐠🐟🐡🦈

orange
🟠🍊🥕🎃🦊🏀🧡🟧🍁🥧🟠🍊🥕🎃🦊🏀🧡🟧🍁🥧🟠🍊🥕🎃🦊🏀🧡🟧🍁🥧🟠🍊🥕🎃🦊🏀🧡🟧🍁🥧

pink
🌸🩷🐷💗🌷🦩🍑🌺💖🧁🌸🩷🐷💗🌷🦩🍑🌺💖🧁🌸🩷🐷💗🌷🦩🍑🌺💖🧁🌸🩷🐷💗🌷🦩🍑🌺💖🧁

purple
🟣🍇🔮🪻🍆🟪💜🫐👾🎆🟣🍇🔮🪻🍆🟪💜🫐👾🎆🟣🍇🔮🪻🍆🟪💜🫐👾🎆🟣🍇🔮🪻🍆🟪💜🫐👾🎆

red
🔴🍎🍒🍅🌹🟥🍓🥊🎈🦞🔴🍎🍒🍅🌹🟥🍓🥊🎈🦞🔴🍎🍒🍅🌹🟥🍓🥊🎈🦞🔴🍎🍒🍅🌹🟥🍓🥊🎈🦞

shoes
👞👟👠👡👢🥾🥿🩴👞👟👠👡👢🥾🥿🩴👞👟👠👡👢🥾🥿🩴👞👟👠👡👢🥾🥿🩴👞👟👠👡👢🥾🥿🩴

sinewave
∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿

sinewave-teal
`∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿`

spring
🌷🌱🐣🦋🌸🐝🪺🐇🌷🌱🐣🦋🌸🐝🪺🐇🌷🌱🐣🦋🌸🐝🪺🐇🌷🌱🐣🦋🌸🐝🪺🐇🌷🌱🐣🦋🌸🐝🪺🐇

summer
🌞🍉🩴🍦🏄🌻🩱🍹🌞🍉🩴🍦🏄🌻🩱🍹🌞🍉🩴🍦🏄🌻🩱🍹🌞🍉🩴🍦🏄🌻🩱🍹🌞🍉🩴🍦🏄🌻🩱🍹

trains
🚂🚃🚋🚋🚃🚃🚃🚋🚃🚋🚋🚋🚃🚃🚋🎪🚃🚃🚋🚃🚃🚃🚋🚋🚋🚙🚋🚃🚃🚋🚃🚋🚃🚃🚃🚋🚃🚋🚃🚗

veg
🥕🥦🥬🌽🥒🍆🫑🧄🧅🥔🥕🥦🥬🌽🥒🍆🫑🧄🧅🥔🥕🥦🥬🌽🥒🍆🫑🧄🧅🥔🥕🥦🥬🌽🥒🍆🫑🧄🧅🥔

vehicles
🚗🚕🚙🚌🚎🚐🚚🛵🚓🚜🚗🚕🚙🚌🚎🚐🚚🛵🚓🚜🚗🚕🚙🚌🚎🚐🚚🛵🚓🚜🚗🚕🚙🚌🚎🚐🚚🛵🚓🚜

winter
⛄🧣🧤🎿🛷🧊🥶🐧⛄🧣🧤🎿🛷🧊🥶🐧⛄🧣🧤🎿🛷🧊🥶🐧⛄🧣🧤🎿🛷🧊🥶🐧⛄🧣🧤🎿🛷🧊🥶🐧

yellow
🟡🍋🌻🐥🧀🍌🟨💛🌼🐝🟡🍋🌻🐥🧀🍌🟨💛🌼🐝🟡🍋🌻🐥🧀🍌🟨💛🌼🐝🟡🍋🌻🐥🧀🍌🟨💛🌼🐝
```
