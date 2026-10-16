# RSLMOSC — RSLM CTRL

> Contrôleur OSC + MIDI mobile pour Resolume Arena, piloté depuis le navigateur d'un téléphone ou d'une console portable.

![Platform](https://img.shields.io/badge/platform-Web%20%2F%20Node.js-informational) ![Resolume](https://img.shields.io/badge/Resolume-Arena-blueviolet) ![Protocol](https://img.shields.io/badge/protocol-OSC%20%2B%20MIDI-orange)

## À propos

RSLM CTRL est un petit serveur Node.js qui sert une surface de contrôle tactile (web) et relaie chaque geste vers Resolume Arena en OSC (UDP), avec une sortie MIDI optionnelle.
**Toutes les adresses OSC sont manuelles — aucune auto-génération.** Chaque contrôle = **label + adresse OSC explicite** : tu tapes l'adresse exacte de Resolume, l'app ne devine rien.

Le code se trouve dans [`resolume-osc-control/`](resolume-osc-control/) (voir aussi son [README](resolume-osc-control/README.md)).

## Fonctionnalités

- **CTRL — surface principale**
  - **Layers** — opacité + bypass, chaque layer a ses adresses OSC éditables. Section masquable (▼/▶).
  - **Effets** — toggle ou fader, chaque route par groupe a son adresse OSC manuelle. Smooth ON/OFF optionnel (interpolation côté serveur à 60 fps).
  - **Levels** — 3 faders (Base / Midpoint / Ratio), chaque groupe a son adresse.
  - **Colorize** — slider de teinte (hue 0°–360°), pas un color picker. Mode LINKED : un seul slider contrôle tous les groupes ; mode UNLINKED : un slider par groupe.
  - **Dreamy Glow** — même logique linked/unlinked + bypass par groupe.
  - **Master** — opacity, blackout, restore.
- **FLOW — mode plein écran** : sélectionne tes contrôles → affichage XXL tactile.
- **PADS — trigger de clips** : 8 pads par page, adresse manuelle (défaut : `/connect`), éditeur avec champ d'adresse OSC libre.
- **Retroid** (`/retroid.html`) : vue simplifiée utilisant la Gamepad API (touches physiques → toggles, joysticks → faders).
- **MIDI, presets, smooth** (menu ⚙) : choix du port MIDI de sortie, presets sauvegardables, durée du smooth.
- Retour OSC : les messages reçus de Resolume sont rediffusés aux clients connectés (WebSocket).

## Installation

Prérequis : [Node.js](https://nodejs.org/) et Resolume Arena avec l'OSC activé.

```bash
cd resolume-osc-control
npm install && npm start
```

Au démarrage, le serveur affiche les URL à ouvrir depuis le réseau local :

```
Main    → http://<ip-locale>:3333
Retroid → http://<ip-locale>:3333/retroid.html
```

## Utilisation

Les réglages par défaut sont dans [`resolume-osc-control/config.json`](resolume-osc-control/config.json) :

| Clé | Défaut | Rôle |
| --- | --- | --- |
| `osc.host` | `127.0.0.1` | Machine qui fait tourner Resolume |
| `osc.sendPort` | `7000` | Port OSC d'entrée de Resolume |
| `osc.receivePort` | `7001` | Port d'écoute du retour OSC |
| `server.httpPort` | `3333` | Port de l'interface web |
| `smooth.defaultDuration` | `500` | Durée du smooth (ms) |

Exemple de routes d'un effet par groupe :

```
Strobe [G1] /composition/groups/1/video/effects/strobe/opacity
       [G2] /composition/groups/2/video/effects/strobe/opacity
```

Les modifications faites dans l'interface sont réécrites dans `config.json` ; les presets sont enregistrés en JSON dans `resolume-osc-control/presets/`.

## Structure du projet

```
resolume-osc-control/
├── server.js          # Serveur Express + WebSocket, pont OSC (UDP), sortie MIDI, smooth
├── config.json        # Adresses OSC, groupes, effets, flows, pads, MIDI
├── package.json
└── public/
    ├── index.html     # Interface principale (CTRL / FLOW / PADS)
    └── retroid.html   # Vue manette (Gamepad API)
```

## Stack technique

Node.js, Express, ws (WebSocket), osc, jzz (MIDI), HTML/JavaScript côté client.

## Crédits & licence

Aucune licence n'est spécifiée — tous droits réservés.

---

<p align="center">
  Fait par <a href="https://github.com/elisalien">Élisalien</a> ·
  <a href="https://gitlab.com/elisalien/catalog">Catalogue des shaders, sources & logiciels</a>
</p>
