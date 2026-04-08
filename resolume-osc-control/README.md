# RSLM CTRL v7

Contrôleur OSC + MIDI mobile pour Resolume Arena.
**Toutes les adresses OSC sont manuelles — aucune auto-génération.**

## Lancer

```bash
npm install && npm start
```

## Principe

Chaque contrôle = **label + adresse OSC explicite**. Tu tapes l'adresse exacte de Resolume, l'app ne devine rien.

## CTRL — Surface principale

**Layers** — opacité + bypass, chaque layer a ses adresses OSC éditables. Section masquable (▼/▶).

**Effets** — toggle ou fader, chaque route par groupe a son adresse OSC manuelle :
```
Strobe [G1] /composition/groups/1/video/effects/strobe/opacity
       [G2] /composition/groups/2/video/effects/strobe/opacity
```
Smooth ON/OFF optionnel (interpolation server-side 60fps).

**Levels** — 3 faders (Base/Midpoint/Ratio), chaque groupe a son adresse.

**Colorize** — slider de teinte (hue 0°-360°), pas un color picker. Mode LINKED : un seul slider contrôle tous les groupes. Mode UNLINKED : un slider par groupe.

**Dreamy Glow** — même logique linked/unlinked + bypass par groupe.

**Master** — opacity, blackout, restore.

## FLOW — Mode plein écran

Sélectionne tes contrôles → affichage XXL tactile.

## PADS — Trigger clips

8 pads par page. Adresse manuelle (défaut : `/connect`). Éditeur avec champ adresse OSC libre.

## Retroid — `/retroid.html`

Vue simplifiée. Gamepad API (touches physiques → toggles, joysticks → faders).

## MIDI, Presets, Smooth

Dans ⚙ : port MIDI, presets sauvegardables, durée smooth.
