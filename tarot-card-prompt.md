# Tarot card image prompts
Prompts for all 78 cards of the Meridian tarot deck, one image each. Every prompt is `STYLE + SUBJECT`, so generate them all with the same style block and the deck reads as one set.
## Where the images go
| | |
|---|---|
| Folder | `zodiya-frontend-v2/public/tarot/` |
| Filename | `<card id>.jpg` exactly as listed below, lower case, e.g. `fool.jpg`, `wands-ace.jpg`, `cups-two.jpg` |
| Served at | `https://testbrain-buzzinga.s3.eu-north-1.amazonaws.com/meridian/tarot/<card id>.jpg` (uploaded from the folder above with `aws s3 sync`) |
| Size | **1000 × 1600 px** (5:8 portrait, the same ratio as the card on screen) |
| Format | JPEG, quality 80 to 85, roughly 150 to 250 KB each. WebP also fine, same name with `.webp` |
| Orientation | Always generate **upright**. The app rotates the image 180° for a reversed card |
| Text | **None in the image.** The app draws the card name and orientation underneath |
The 78 faces are done and live. One image is still missing: the **card back**, described in the next section.
## Card back (1 image)
| | |
|---|---|
| File | `public/tarot/card-back.jpg` |
| Size | **1000 × 1600 px**, same as the faces |
| Colour | **Dark navy, not cream.** The back sits on the navy page before the flip, and it must look the same when turned 180°, so the design is symmetric top to bottom and left to right |
| Text | None |

Full prompt, ready to paste (do not prepend the cream STYLE block to this one):
```
Back of a tarot card. Fine-line etching and art deco style in muted gold (#B4933F) and pale cream (#F4ECDC) linework on a deep navy background (#141B2C), like gold leaf on dark card stock. Centred astrolabe motif: three thin concentric rings around a small solid gold sun disc, twelve fine spokes radiating from the centre like the hours of a clock, tiny stars scattered between the rings. A thin double border of gold lines runs just inside the card edge with a small four pointed star in each corner. Perfectly symmetrical vertically and horizontally so it reads the same upside down. Flat, printed look with visible paper grain. Portrait format, 5:8. No text, no letters, no numerals, no figures, no watermark.
```
Negative prompt:
```
text, letters, numbers, words, watermark, signature, human figure, face, animal, photorealistic, 3D render, glossy, lens flare, blurry, cream background, white background, asymmetric, off centre, multiple cards
```
Drop the file in `public/tarot/`, tell me, and I will upload it to the bucket and swap the drawn back in `src/pages/Tarot.jsx` for the image.
## STYLE (prepend to every prompt)
```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck.
```
## Negative prompt (use on every card if your tool supports one)
```
text, letters, numbers, words, watermark, signature, border, frame, card edge, photorealistic, 3D render, blurry, extra limbs, multiple panels, collage, dark background, black background
```
## Consistency tips
- Generate a few Major Arcana first (Fool, Star, Tower). Once one looks right, lock its seed or use it as a style reference for the rest.
- Keep the subject prompts as written. They follow the traditional Rider Waite Smith imagery, so anyone who knows tarot will recognise every card.
- Court cards (Page, Knight, Queen, King) should share a face and dress across the four suits only loosely; each suit has its own landscape: Wands desert, Cups water, Swords windswept sky, Pentacles farmland and gardens.
- Reject any output with lettering, a border, or a dark background. The card face is cream on purpose so it lifts off the navy page.
## The 78 cards
| # | Card | File | Subject prompt |
|---|---|---|---|
| 1 | The Fool | `public/tarot/fool.jpg` | A young traveller stepping off a cliff edge with a small bundle tied to a staff over one shoulder, a white rose in the other hand, a small white dog leaping at their heels, a sun disc above, gaze lifted to the sky, carefree. |
| 2 | The Magician | `public/tarot/magician.jpg` | A figure standing at a table, one arm raised holding a short wand to the sky, the other hand pointing to the ground; on the table a cup, a sword, a gold coin and a staff; a horizontal infinity loop floating above the head; roses and lilies in the foreground. |
| 3 | The High Priestess | `public/tarot/high-priestess.jpg` | A veiled woman seated between two pillars, one dark and one light, a crescent moon at her feet, a rolled scroll in her lap, a lunar crown, a thin veil patterned with pomegranates behind her. |
| 4 | The Empress | `public/tarot/empress.jpg` | A crowned woman reclining on a cushioned throne in a field of ripe wheat, a heart shaped shield resting beside her, a crown of twelve stars, a stream and a forest behind. |
| 5 | The Emperor | `public/tarot/emperor.jpg` | A bearded ruler seated on a stone throne carved with rams' heads, holding an ankh sceptre in one hand and an orb in the other, bare mountains behind. |
| 6 | The Hierophant | `public/tarot/hierophant.jpg` | A robed figure on a throne between two pillars wearing a triple crown, one hand raised in blessing, two kneeling acolytes below, a pair of crossed keys at his feet. |
| 7 | The Lovers | `public/tarot/lovers.jpg` | A man and a woman standing beneath a great angel with outstretched wings, a tree of flames behind the man, a fruit tree with a serpent behind the woman, a sun above them all. |
| 8 | The Chariot | `public/tarot/chariot.jpg` | A crowned warrior standing in a stone chariot drawn by a black sphinx and a white sphinx, a canopy of stars overhead, a walled city in the distance. |
| 9 | Strength | `public/tarot/strength.jpg` | A woman in a white dress gently closing the jaws of a lion with her bare hands, a horizontal infinity loop above her head, a garland of flowers at her waist. |
| 10 | The Hermit | `public/tarot/hermit.jpg` | An old cloaked figure standing alone on a mountain peak, head bowed, holding a lantern with a six pointed star glowing inside it and a long staff. |
| 11 | Wheel of Fortune | `public/tarot/wheel-of-fortune.jpg` | A great wheel suspended in the sky with a sphinx seated on top, a serpent descending one side, a jackal headed figure rising the other, four winged creatures in the corners reading books. |
| 12 | Justice | `public/tarot/justice.jpg` | A crowned figure seated between two pillars, an upright sword raised in one hand and a pair of balanced scales in the other, a veil hanging behind. |
| 13 | The Hanged Man | `public/tarot/hanged-man.jpg` | A man hanging upside down by one foot from a living T shaped tree, the other leg bent behind the knee, hands behind his back, a soft halo around his calm face. |
| 14 | Death | `public/tarot/death.jpg` | A skeleton in black armour on a white horse carrying a black banner with a white rose, a fallen king beneath the hooves, a bishop, a child and a woman before it, the sun rising between two distant towers. |
| 15 | Temperance | `public/tarot/temperance.jpg` | A winged angel with one foot on land and one in a pool, pouring water in an unbroken stream between two cups, a path winding to a rising sun, irises at the water's edge. |
| 16 | The Devil | `public/tarot/devil.jpg` | A horned goat headed figure squatting on a black pedestal with bat wings, an inverted pentagram on its forehead, a man and a woman loosely chained at the base, a torch held pointing downward. |
| 17 | The Tower | `public/tarot/tower.jpg` | A tall stone tower on a rocky crag struck by a bolt of lightning, its crown blown off, flames leaping from the windows, two figures falling, drops of light scattered in the air. |
| 18 | The Star | `public/tarot/star.jpg` | A kneeling woman at the edge of a pool pouring water from two jugs, one onto the earth and one into the water, a large eight pointed star above with seven smaller stars around it, a bird perched in a tree. |
| 19 | The Moon | `public/tarot/moon.jpg` | A full moon with a serene face between two distant towers, a dog and a wolf howling up at it, a crayfish crawling out of a pool, a winding path to the hills, drops of dew falling. |
| 20 | The Sun | `public/tarot/sun.jpg` | A radiant sun with a calm face, a naked child riding a white horse and holding a long red banner, a low wall of sunflowers behind. |
| 21 | Judgement | `public/tarot/judgement.jpg` | An angel in the clouds blowing a long trumpet with a banner, figures rising from open coffins with arms raised, mountains and still water behind. |
| 22 | The World | `public/tarot/world.jpg` | A dancing figure wrapped in a flowing scarf holding a short wand in each hand, inside a large oval laurel wreath, four heads in the corners: an angel, an eagle, a lion and a bull. |
| 23 | Ace of Wands | `public/tarot/wands-ace.jpg` | A hand emerging from a cloud holding a single sprouting wooden staff, leaves falling from it, a castle on a hill in the distance. |
| 24 | Two of Wands | `public/tarot/wands-two.jpg` | A man in a long robe standing on a castle battlement holding a small globe in one hand and a staff in the other, a second staff fixed to the wall, looking out over the sea. |
| 25 | Three of Wands | `public/tarot/wands-three.jpg` | A figure seen from behind standing on a cliff top looking out at three small ships on the sea, three staffs planted upright around him. |
| 26 | Four of Wands | `public/tarot/wands-four.jpg` | Four staffs standing in a square with a garland of flowers strung between their tops, two figures beneath raising bouquets in celebration, a castle behind. |
| 27 | Five of Wands | `public/tarot/wands-five.jpg` | Five young men in a mock fight brandishing staffs, the staffs crossing chaotically, no one hurt. |
| 28 | Six of Wands | `public/tarot/wands-six.jpg` | A rider crowned with laurel on a white horse holding a staff topped with a laurel wreath, a crowd walking alongside with staffs raised. |
| 29 | Seven of Wands | `public/tarot/wands-seven.jpg` | A man standing on higher ground defending himself with a staff against six staffs rising toward him from below. |
| 30 | Eight of Wands | `public/tarot/wands-eight.jpg` | Eight staffs flying in parallel diagonally across an open sky above a calm landscape with a river. |
| 31 | Nine of Wands | `public/tarot/wands-nine.jpg` | A bandaged man leaning on a staff, looking warily to one side, eight staffs standing like a fence behind him. |
| 32 | Ten of Wands | `public/tarot/wands-ten.jpg` | A man bent forward under the weight of ten staffs bundled in his arms, walking toward a small house in the distance. |
| 33 | Page of Wands | `public/tarot/wands-page.jpg` | A young figure in a tunic holding a tall sprouting staff upright with both hands and gazing up at it, a desert with pyramids behind. |
| 34 | Knight of Wands | `public/tarot/wands-knight.jpg` | An armoured knight on a rearing horse holding a staff, a plumed helmet and a cape flying, a desert landscape behind. |
| 35 | Queen of Wands | `public/tarot/wands-queen.jpg` | A crowned queen on a throne holding a staff in one hand and a sunflower in the other, a black cat at her feet, lions carved on the throne. |
| 36 | King of Wands | `public/tarot/wands-king.jpg` | A crowned king on a throne holding a sprouting staff, a salamander at his feet, lions and salamanders carved on the throne back. |
| 37 | Ace of Cups | `public/tarot/cups-ace.jpg` | A hand emerging from a cloud holding a chalice that overflows in five streams, a white dove descending toward it, lotus flowers on the pond below. |
| 38 | Two of Cups | `public/tarot/cups-two.jpg` | A man and a woman facing each other and exchanging cups, a winged lion head above a caduceus hovering between them. |
| 39 | Three of Cups | `public/tarot/cups-three.jpg` | Three women dancing in a circle with cups raised, fruit and vines at their feet. |
| 40 | Four of Cups | `public/tarot/cups-four.jpg` | A young man sitting cross legged beneath a tree with arms folded, three cups on the ground before him, a fourth cup offered by a hand from a cloud that he ignores. |
| 41 | Five of Cups | `public/tarot/cups-five.jpg` | A cloaked figure with bowed head standing over three spilled cups, two cups still upright behind him, a river and a bridge leading to a castle. |
| 42 | Six of Cups | `public/tarot/cups-six.jpg` | A child handing a cup holding a single white flower to a smaller child in a courtyard, four more flower filled cups around them, an old manor house behind. |
| 43 | Seven of Cups | `public/tarot/cups-seven.jpg` | A silhouetted figure facing seven cups floating in cloud, each holding a vision: a castle, jewels, a laurel wreath, a dragon, a head, a serpent and a veiled figure. |
| 44 | Eight of Cups | `public/tarot/cups-eight.jpg` | A figure walking away up a mountain path under a moon, eight cups stacked behind with a gap in the top row. |
| 45 | Nine of Cups | `public/tarot/cups-nine.jpg` | A contented man sitting with arms folded in front of a curved table holding nine cups arranged in an arc behind him. |
| 46 | Ten of Cups | `public/tarot/cups-ten.jpg` | A couple with arms raised beneath a rainbow of ten cups, two children dancing beside them, a house and a river beyond. |
| 47 | Page of Cups | `public/tarot/cups-page.jpg` | A young figure in a tunic holding a cup from which a small fish peeks out, gentle sea waves behind. |
| 48 | Knight of Cups | `public/tarot/cups-knight.jpg` | A knight on a calmly walking horse holding a cup out in front of him, a winged helmet, a river and low hills. |
| 49 | Queen of Cups | `public/tarot/cups-queen.jpg` | A crowned queen on a throne shaped like a shell at the water's edge, holding an ornate lidded chalice and gazing at it. |
| 50 | King of Cups | `public/tarot/cups-king.jpg` | A crowned king on a throne that floats on a calm sea, holding a cup and a short sceptre, a fish and a ship in the background. |
| 51 | Ace of Swords | `public/tarot/swords-ace.jpg` | A hand emerging from a cloud gripping an upright sword topped with a crown and laurel, bare mountains below. |
| 52 | Two of Swords | `public/tarot/swords-two.jpg` | A blindfolded woman seated on a stone bench holding two crossed swords over her chest, a crescent moon above, calm water behind. |
| 53 | Three of Swords | `public/tarot/swords-three.jpg` | A single heart pierced by three swords against a background of rain and grey cloud. |
| 54 | Four of Swords | `public/tarot/swords-four.jpg` | A knight lying in effigy on a tomb with hands in prayer, three swords hanging on the wall above him and one carved beneath, a stained glass window. |
| 55 | Five of Swords | `public/tarot/swords-five.jpg` | A smirking man gathering three swords, two more lying on the ground, two figures walking away in defeat, a stormy sky. |
| 56 | Six of Swords | `public/tarot/swords-six.jpg` | A ferryman poling a small boat carrying a cloaked woman and a child across calm water, six swords standing upright in the boat. |
| 57 | Seven of Swords | `public/tarot/swords-seven.jpg` | A man tiptoeing away from a camp of tents carrying five swords, two more left standing in the ground behind him. |
| 58 | Eight of Swords | `public/tarot/swords-eight.jpg` | A bound and blindfolded woman standing among eight swords stuck in the ground, marshy earth, a castle on a cliff behind. |
| 59 | Nine of Swords | `public/tarot/swords-nine.jpg` | A figure sitting up in bed with face buried in hands, nine swords hanging horizontally on the dark wall behind. |
| 60 | Ten of Swords | `public/tarot/swords-ten.jpg` | A figure lying face down with ten swords in the back, a dark sky with dawn breaking on the horizon over still water. |
| 61 | Page of Swords | `public/tarot/swords-page.jpg` | A young figure holding a sword upright in both hands on uneven ground, hair and clouds blown by wind, birds in the sky. |
| 62 | Knight of Swords | `public/tarot/swords-knight.jpg` | A knight on a charging horse with sword raised, cape and clouds streaming, trees bent by the wind. |
| 63 | Queen of Swords | `public/tarot/swords-queen.jpg` | A crowned queen in profile on a throne holding a raised sword, the other hand extended, clouds gathering, a single bird overhead. |
| 64 | King of Swords | `public/tarot/swords-king.jpg` | A crowned king facing forward on a throne holding an upright sword, butterflies and crescent moons carved on the throne, two birds in the sky. |
| 65 | Ace of Pentacles | `public/tarot/pentacles-ace.jpg` | A hand emerging from a cloud holding a large gold coin engraved with a five pointed star, a garden of lilies below and an archway opening onto mountains. |
| 66 | Two of Pentacles | `public/tarot/pentacles-two.jpg` | A young man dancing while juggling two gold coins joined by a ribbon in the shape of an infinity loop, ships on rolling waves behind. |
| 67 | Three of Pentacles | `public/tarot/pentacles-three.jpg` | A stonemason working on a bench inside a cathedral arch while a monk and an architect holding plans look on, three five pointed stars carved in the arch. |
| 68 | Four of Pentacles | `public/tarot/pentacles-four.jpg` | A crowned man seated and clutching one gold coin to his chest, another balanced on his head, one under each foot, a city behind. |
| 69 | Five of Pentacles | `public/tarot/pentacles-five.jpg` | Two ragged figures, one on crutches, walking through falling snow past a lit stained glass window showing five gold stars. |
| 70 | Six of Pentacles | `public/tarot/pentacles-six.jpg` | A merchant holding a pair of scales in one hand and giving coins to two kneeling beggars with the other, six gold coins above. |
| 71 | Seven of Pentacles | `public/tarot/pentacles-seven.jpg` | A young farmer leaning on a hoe and gazing at a vine bush laden with seven gold coins. |
| 72 | Eight of Pentacles | `public/tarot/pentacles-eight.jpg` | A craftsman at a bench chiselling a star into a gold coin, six finished coins hung on a post beside him and one at his feet. |
| 73 | Nine of Pentacles | `public/tarot/pentacles-nine.jpg` | A well dressed woman standing in a vineyard with a hooded falcon on her gloved hand, nine gold coins among the vines, a snail on the ground. |
| 74 | Ten of Pentacles | `public/tarot/pentacles-ten.jpg` | An old man seated with two dogs beneath an archway, a couple and a child in the courtyard beyond, ten gold coins arranged in a tree pattern. |
| 75 | Page of Pentacles | `public/tarot/pentacles-page.jpg` | A young figure standing in a field holding a single gold coin up with both hands and gazing at it, a ploughed field and trees behind. |
| 76 | Knight of Pentacles | `public/tarot/pentacles-knight.jpg` | An armoured knight on a still black horse holding a gold coin and looking at it, ploughed fields behind. |
| 77 | Queen of Pentacles | `public/tarot/pentacles-queen.jpg` | A crowned queen on a throne carved with fruit and goats, a gold coin in her lap, a rabbit at her feet, roses arching overhead. |
| 78 | King of Pentacles | `public/tarot/pentacles-king.jpg` | A crowned king on a throne carved with bulls, holding a sceptre and a gold coin, vines and grapes around him, a castle behind. |

## Full prompts, ready to paste
Each is the style block plus the subject. Copy one line per card.

### Major Arcana

**The Fool** → `public/tarot/fool.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A young traveller stepping off a cliff edge with a small bundle tied to a staff over one shoulder, a white rose in the other hand, a small white dog leaping at their heels, a sun disc above, gaze lifted to the sky, carefree.
```

**The Magician** → `public/tarot/magician.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A figure standing at a table, one arm raised holding a short wand to the sky, the other hand pointing to the ground; on the table a cup, a sword, a gold coin and a staff; a horizontal infinity loop floating above the head; roses and lilies in the foreground.
```

**The High Priestess** → `public/tarot/high-priestess.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A veiled woman seated between two pillars, one dark and one light, a crescent moon at her feet, a rolled scroll in her lap, a lunar crown, a thin veil patterned with pomegranates behind her.
```

**The Empress** → `public/tarot/empress.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A crowned woman reclining on a cushioned throne in a field of ripe wheat, a heart shaped shield resting beside her, a crown of twelve stars, a stream and a forest behind.
```

**The Emperor** → `public/tarot/emperor.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A bearded ruler seated on a stone throne carved with rams' heads, holding an ankh sceptre in one hand and an orb in the other, bare mountains behind.
```

**The Hierophant** → `public/tarot/hierophant.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A robed figure on a throne between two pillars wearing a triple crown, one hand raised in blessing, two kneeling acolytes below, a pair of crossed keys at his feet.
```

**The Lovers** → `public/tarot/lovers.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A man and a woman standing beneath a great angel with outstretched wings, a tree of flames behind the man, a fruit tree with a serpent behind the woman, a sun above them all.
```

**The Chariot** → `public/tarot/chariot.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A crowned warrior standing in a stone chariot drawn by a black sphinx and a white sphinx, a canopy of stars overhead, a walled city in the distance.
```

**Strength** → `public/tarot/strength.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A woman in a white dress gently closing the jaws of a lion with her bare hands, a horizontal infinity loop above her head, a garland of flowers at her waist.
```

**The Hermit** → `public/tarot/hermit.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. An old cloaked figure standing alone on a mountain peak, head bowed, holding a lantern with a six pointed star glowing inside it and a long staff.
```

**Wheel of Fortune** → `public/tarot/wheel-of-fortune.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A great wheel suspended in the sky with a sphinx seated on top, a serpent descending one side, a jackal headed figure rising the other, four winged creatures in the corners reading books.
```

**Justice** → `public/tarot/justice.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A crowned figure seated between two pillars, an upright sword raised in one hand and a pair of balanced scales in the other, a veil hanging behind.
```

**The Hanged Man** → `public/tarot/hanged-man.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A man hanging upside down by one foot from a living T shaped tree, the other leg bent behind the knee, hands behind his back, a soft halo around his calm face.
```

**Death** → `public/tarot/death.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A skeleton in black armour on a white horse carrying a black banner with a white rose, a fallen king beneath the hooves, a bishop, a child and a woman before it, the sun rising between two distant towers.
```

**Temperance** → `public/tarot/temperance.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A winged angel with one foot on land and one in a pool, pouring water in an unbroken stream between two cups, a path winding to a rising sun, irises at the water's edge.
```

**The Devil** → `public/tarot/devil.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A horned goat headed figure squatting on a black pedestal with bat wings, an inverted pentagram on its forehead, a man and a woman loosely chained at the base, a torch held pointing downward.
```

**The Tower** → `public/tarot/tower.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A tall stone tower on a rocky crag struck by a bolt of lightning, its crown blown off, flames leaping from the windows, two figures falling, drops of light scattered in the air.
```

**The Star** → `public/tarot/star.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A kneeling woman at the edge of a pool pouring water from two jugs, one onto the earth and one into the water, a large eight pointed star above with seven smaller stars around it, a bird perched in a tree.
```

**The Moon** → `public/tarot/moon.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A full moon with a serene face between two distant towers, a dog and a wolf howling up at it, a crayfish crawling out of a pool, a winding path to the hills, drops of dew falling.
```

**The Sun** → `public/tarot/sun.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A radiant sun with a calm face, a naked child riding a white horse and holding a long red banner, a low wall of sunflowers behind.
```

**Judgement** → `public/tarot/judgement.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. An angel in the clouds blowing a long trumpet with a banner, figures rising from open coffins with arms raised, mountains and still water behind.
```

**The World** → `public/tarot/world.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A dancing figure wrapped in a flowing scarf holding a short wand in each hand, inside a large oval laurel wreath, four heads in the corners: an angel, an eagle, a lion and a bull.
```

### Wands

**Ace of Wands** → `public/tarot/wands-ace.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A hand emerging from a cloud holding a single sprouting wooden staff, leaves falling from it, a castle on a hill in the distance.
```

**Two of Wands** → `public/tarot/wands-two.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A man in a long robe standing on a castle battlement holding a small globe in one hand and a staff in the other, a second staff fixed to the wall, looking out over the sea.
```

**Three of Wands** → `public/tarot/wands-three.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A figure seen from behind standing on a cliff top looking out at three small ships on the sea, three staffs planted upright around him.
```

**Four of Wands** → `public/tarot/wands-four.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. Four staffs standing in a square with a garland of flowers strung between their tops, two figures beneath raising bouquets in celebration, a castle behind.
```

**Five of Wands** → `public/tarot/wands-five.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. Five young men in a mock fight brandishing staffs, the staffs crossing chaotically, no one hurt.
```

**Six of Wands** → `public/tarot/wands-six.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A rider crowned with laurel on a white horse holding a staff topped with a laurel wreath, a crowd walking alongside with staffs raised.
```

**Seven of Wands** → `public/tarot/wands-seven.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A man standing on higher ground defending himself with a staff against six staffs rising toward him from below.
```

**Eight of Wands** → `public/tarot/wands-eight.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. Eight staffs flying in parallel diagonally across an open sky above a calm landscape with a river.
```

**Nine of Wands** → `public/tarot/wands-nine.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A bandaged man leaning on a staff, looking warily to one side, eight staffs standing like a fence behind him.
```

**Ten of Wands** → `public/tarot/wands-ten.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A man bent forward under the weight of ten staffs bundled in his arms, walking toward a small house in the distance.
```

**Page of Wands** → `public/tarot/wands-page.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A young figure in a tunic holding a tall sprouting staff upright with both hands and gazing up at it, a desert with pyramids behind.
```

**Knight of Wands** → `public/tarot/wands-knight.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. An armoured knight on a rearing horse holding a staff, a plumed helmet and a cape flying, a desert landscape behind.
```

**Queen of Wands** → `public/tarot/wands-queen.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A crowned queen on a throne holding a staff in one hand and a sunflower in the other, a black cat at her feet, lions carved on the throne.
```

**King of Wands** → `public/tarot/wands-king.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A crowned king on a throne holding a sprouting staff, a salamander at his feet, lions and salamanders carved on the throne back.
```

### Cups

**Ace of Cups** → `public/tarot/cups-ace.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A hand emerging from a cloud holding a chalice that overflows in five streams, a white dove descending toward it, lotus flowers on the pond below.
```

**Two of Cups** → `public/tarot/cups-two.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A man and a woman facing each other and exchanging cups, a winged lion head above a caduceus hovering between them.
```

**Three of Cups** → `public/tarot/cups-three.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. Three women dancing in a circle with cups raised, fruit and vines at their feet.
```

**Four of Cups** → `public/tarot/cups-four.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A young man sitting cross legged beneath a tree with arms folded, three cups on the ground before him, a fourth cup offered by a hand from a cloud that he ignores.
```

**Five of Cups** → `public/tarot/cups-five.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A cloaked figure with bowed head standing over three spilled cups, two cups still upright behind him, a river and a bridge leading to a castle.
```

**Six of Cups** → `public/tarot/cups-six.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A child handing a cup holding a single white flower to a smaller child in a courtyard, four more flower filled cups around them, an old manor house behind.
```

**Seven of Cups** → `public/tarot/cups-seven.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A silhouetted figure facing seven cups floating in cloud, each holding a vision: a castle, jewels, a laurel wreath, a dragon, a head, a serpent and a veiled figure.
```

**Eight of Cups** → `public/tarot/cups-eight.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A figure walking away up a mountain path under a moon, eight cups stacked behind with a gap in the top row.
```

**Nine of Cups** → `public/tarot/cups-nine.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A contented man sitting with arms folded in front of a curved table holding nine cups arranged in an arc behind him.
```

**Ten of Cups** → `public/tarot/cups-ten.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A couple with arms raised beneath a rainbow of ten cups, two children dancing beside them, a house and a river beyond.
```

**Page of Cups** → `public/tarot/cups-page.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A young figure in a tunic holding a cup from which a small fish peeks out, gentle sea waves behind.
```

**Knight of Cups** → `public/tarot/cups-knight.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A knight on a calmly walking horse holding a cup out in front of him, a winged helmet, a river and low hills.
```

**Queen of Cups** → `public/tarot/cups-queen.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A crowned queen on a throne shaped like a shell at the water's edge, holding an ornate lidded chalice and gazing at it.
```

**King of Cups** → `public/tarot/cups-king.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A crowned king on a throne that floats on a calm sea, holding a cup and a short sceptre, a fish and a ship in the background.
```

### Swords

**Ace of Swords** → `public/tarot/swords-ace.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A hand emerging from a cloud gripping an upright sword topped with a crown and laurel, bare mountains below.
```

**Two of Swords** → `public/tarot/swords-two.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A blindfolded woman seated on a stone bench holding two crossed swords over her chest, a crescent moon above, calm water behind.
```

**Three of Swords** → `public/tarot/swords-three.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A single heart pierced by three swords against a background of rain and grey cloud.
```

**Four of Swords** → `public/tarot/swords-four.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A knight lying in effigy on a tomb with hands in prayer, three swords hanging on the wall above him and one carved beneath, a stained glass window.
```

**Five of Swords** → `public/tarot/swords-five.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A smirking man gathering three swords, two more lying on the ground, two figures walking away in defeat, a stormy sky.
```

**Six of Swords** → `public/tarot/swords-six.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A ferryman poling a small boat carrying a cloaked woman and a child across calm water, six swords standing upright in the boat.
```

**Seven of Swords** → `public/tarot/swords-seven.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A man tiptoeing away from a camp of tents carrying five swords, two more left standing in the ground behind him.
```

**Eight of Swords** → `public/tarot/swords-eight.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A bound and blindfolded woman standing among eight swords stuck in the ground, marshy earth, a castle on a cliff behind.
```

**Nine of Swords** → `public/tarot/swords-nine.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A figure sitting up in bed with face buried in hands, nine swords hanging horizontally on the dark wall behind.
```

**Ten of Swords** → `public/tarot/swords-ten.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A figure lying face down with ten swords in the back, a dark sky with dawn breaking on the horizon over still water.
```

**Page of Swords** → `public/tarot/swords-page.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A young figure holding a sword upright in both hands on uneven ground, hair and clouds blown by wind, birds in the sky.
```

**Knight of Swords** → `public/tarot/swords-knight.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A knight on a charging horse with sword raised, cape and clouds streaming, trees bent by the wind.
```

**Queen of Swords** → `public/tarot/swords-queen.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A crowned queen in profile on a throne holding a raised sword, the other hand extended, clouds gathering, a single bird overhead.
```

**King of Swords** → `public/tarot/swords-king.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A crowned king facing forward on a throne holding an upright sword, butterflies and crescent moons carved on the throne, two birds in the sky.
```

### Pentacles

**Ace of Pentacles** → `public/tarot/pentacles-ace.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A hand emerging from a cloud holding a large gold coin engraved with a five pointed star, a garden of lilies below and an archway opening onto mountains.
```

**Two of Pentacles** → `public/tarot/pentacles-two.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A young man dancing while juggling two gold coins joined by a ribbon in the shape of an infinity loop, ships on rolling waves behind.
```

**Three of Pentacles** → `public/tarot/pentacles-three.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A stonemason working on a bench inside a cathedral arch while a monk and an architect holding plans look on, three five pointed stars carved in the arch.
```

**Four of Pentacles** → `public/tarot/pentacles-four.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A crowned man seated and clutching one gold coin to his chest, another balanced on his head, one under each foot, a city behind.
```

**Five of Pentacles** → `public/tarot/pentacles-five.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. Two ragged figures, one on crutches, walking through falling snow past a lit stained glass window showing five gold stars.
```

**Six of Pentacles** → `public/tarot/pentacles-six.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A merchant holding a pair of scales in one hand and giving coins to two kneeling beggars with the other, six gold coins above.
```

**Seven of Pentacles** → `public/tarot/pentacles-seven.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A young farmer leaning on a hoe and gazing at a vine bush laden with seven gold coins.
```

**Eight of Pentacles** → `public/tarot/pentacles-eight.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A craftsman at a bench chiselling a star into a gold coin, six finished coins hung on a post beside him and one at his feet.
```

**Nine of Pentacles** → `public/tarot/pentacles-nine.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A well dressed woman standing in a vineyard with a hooded falcon on her gloved hand, nine gold coins among the vines, a snail on the ground.
```

**Ten of Pentacles** → `public/tarot/pentacles-ten.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. An old man seated with two dogs beneath an archway, a couple and a child in the courtyard beyond, ten gold coins arranged in a tree pattern.
```

**Page of Pentacles** → `public/tarot/pentacles-page.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A young figure standing in a field holding a single gold coin up with both hands and gazing at it, a ploughed field and trees behind.
```

**Knight of Pentacles** → `public/tarot/pentacles-knight.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. An armoured knight on a still black horse holding a gold coin and looking at it, ploughed fields behind.
```

**Queen of Pentacles** → `public/tarot/pentacles-queen.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A crowned queen on a throne carved with fruit and goats, a gold coin in her lap, a rabbit at her feet, roses arching overhead.
```

**King of Pentacles** → `public/tarot/pentacles-king.jpg`

```
Vintage tarot card illustration in a fine-line etching and art deco style. Dark ink (#1A1D2B) and muted gold (#B4933F) linework on warm cream paper (#F3EFE6), with sparse flat fills in soft gold (#E2C97F) and sage green (#5F8B7A). Centred, symmetrical composition with one clear subject and generous negative space. Portrait format, 5:8. No text, no letters, no numerals, no border, no frame, no watermark. Part of a single unified deck. A crowned king on a throne carved with bulls, holding a sceptre and a gold coin, vines and grapes around him, a castle behind.
```
