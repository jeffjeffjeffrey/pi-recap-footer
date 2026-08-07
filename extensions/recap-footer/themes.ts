// Generated from the original ask-stamp catalog. Glyph invariants:
//   - no U+FE0F variation selectors, no ZWJ sequences
//   - no base characters whose default presentation is text
// Violating either makes glyphs render half-width and the row goes ragged.

export const EMOJI_WIDTH = 40; // double-width glyphs -> ~80 columns, matching pi's <hr>
export const TEXT_WIDTH = 80; // single-width glyphs

export const EMOJI_THEMES: Record<string, string> = {
	"green": "🌿🍀🥬🥒🐸🌵🍃🥝🫑🐢🌲🥦",
	"purple": "🟣🍇🔮🪻🍆🟪💜🫐👾🎆",
	"orange": "🟠🍊🥕🎃🦊🏀🧡🟧🍁🥧",
	"yellow": "🟡🍋🌻🐥🧀🍌🟨💛🌼🐝",
	"blue": "🔵🌊🐳🫐💧🐟🧊🟦💙🐋",
	"red": "🔴🍎🍒🍅🌹🟥🍓🥊🎈🦞",
	"pink": "🌸🩷🐷💗🌷🦩🍑🌺💖🧁",
	"brown": "🟤🟫🐻🍂🥔🌰🪵🍞🐴🦫",
	"mono": "⚫⚪🔘🖤🤍🩶🎱🐧",
	"moon": "🌑🌒🌓🌔🌕🌖🌗🌘",
	"spring": "🌷🌱🐣🦋🌸🐝🪺🐇",
	"summer": "🌞🍉🩴🍦🏄🌻🩱🍹",
	"autumn": "🍂🍁🌰🎃🦃🍄🧣🥧",
	"winter": "⛄🧣🧤🎿🛷🧊🥶🐧",
	"flowers": "🌸🌺🌻🌷🌹🪷🌼💐🥀🪻",
	"junkfood": "🍔🍟🌭🍕🍩🍿🍫🍬🍭🧁🥤🍪",
	"fruit": "🍎🍊🍋🍌🍉🍇🍓🍑🥭🍍🥝🍒",
	"veg": "🥕🥦🥬🌽🥒🍆🫑🧄🧅🥔",
	"breakfast": "🍳🥓🥞🧇🥐🥯🍞🥚🧈🥛",
	"hotdogs": "🌭",
	"ocean": "🐠🐟🐡🦈🐬🐳🐙🦑🦀🦞🐚🪸",
	"farm": "🐮🐷🐔🐴🐑🐐🦆🦃🐄🐖",
	"bugs": "🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌",
	"forest": "🌲🌳🌴🌵🎋🪵🍄🍂🦌🦉",
	"desert": "🌵🐍🦂🌞🪨🐫🌾🥵",
	"beach": "🌴🥥🐚🩴🌊🦀🏄🐠",
	"gems": "💎💍👑🪙🏆🥇🧿🔮",
	"vehicles": "🚗🚕🚙🚌🚎🚐🚚🛵🚓🚜",
	"shoes": "👞👟👠👡👢🥾🥿🩴",
	"halloween": "🎃👻💀🦇🧛🧟🧙🍬",
};

// Text waves. `teal: true` wraps the row in backticks so the markdown renderer
// paints it with mdCode; plain rows inherit body text colour.
export const TEXT_THEMES: Record<string, { unit: string; teal: boolean }> = {
	"braille": { unit: "⣀⡠⠔⠊⠉⠑⠢⢄", teal: false },
	"braille-teal": { unit: "⣀⡠⠔⠊⠉⠑⠢⢄", teal: true },
	"sinewave": { unit: "∿", teal: false },
	"sinewave-teal": { unit: "∿", teal: true },
};

// One continuous train: locomotive, shuffled cars, occasional gag, red car caboose.
export const TRAIN_LOCO = "🚂";
export const TRAIN_CARS = ["🚃", "🚃", "🚃", "🚋", "🚋"];
export const TRAIN_GAGS = ["🐄", "🚙", "🛻", "🎪"];
export const TRAIN_GAG_ODDS = 0.07;
export const TRAIN_CABOOSE = "🚗";

export const THEME_NAMES: string[] = [
	"autumn",
	"beach",
	"blue",
	"braille",
	"braille-teal",
	"breakfast",
	"brown",
	"bugs",
	"desert",
	"farm",
	"flowers",
	"forest",
	"fruit",
	"gems",
	"green",
	"halloween",
	"hotdogs",
	"junkfood",
	"mono",
	"moon",
	"ocean",
	"orange",
	"pink",
	"purple",
	"red",
	"shoes",
	"sinewave",
	"sinewave-teal",
	"spring",
	"summer",
	"trains",
	"veg",
	"vehicles",
	"winter",
	"yellow",
];

