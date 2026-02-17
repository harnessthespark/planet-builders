import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Dimensions, Animated, Modal,
} from 'react-native';
// Simple storage wrapper (works on web/Snack without external packages)
const Storage = {
  getItem: async (key: string): Promise<string | null> => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try { localStorage.setItem(key, value); } catch {}
  },
};

// ─── TYPES ───────────────────────────────────────────────────────────
type Language = 'en' | 'de';
type AgeGroup = '4-5' | '6-7' | '8-9' | '10-11';
type Screen =
  | 'languageSelect' | 'profileSelect' | 'createProfile'
  | 'planet' | 'shop' | 'missionSelect' | 'missionPlay'
  | 'badges' | 'parentPin' | 'parentSettings';

interface ParentSettings {
  pin: string;
  sessionMinutes: number; // 0 = no limit
  mathsEnabled: boolean;
  spellingEnabled: boolean;
  scienceEnabled: boolean;
  questionsPerRound: number;
}

const DEFAULT_SETTINGS: ParentSettings = {
  pin: '1234',
  sessionMinutes: 0,
  mathsEnabled: true,
  spellingEnabled: true,
  scienceEnabled: true,
  questionsPerRound: 5,
};

interface Profile {
  name: string;
  age: AgeGroup;
  language: Language;
  coins: number;
  xp: number;
  level: number;
  biome: string;
  structures: string[];
  creatures: string[];
  stats: { maths: number; spelling: number; science: number };
  badges: string[];
  combo: number;
  bestCombo: number;
}

interface Badge {
  id: string;
  name: Record<Language, string>;
  desc: Record<Language, string>;
  check: (p: Profile) => boolean;
}

interface PlanetEvent {
  id: string;
  message: Record<Language, string>;
  mission: 'maths' | 'spelling' | 'science';
}

// ─── DIMENSIONS ──────────────────────────────────────────────────────
const { width: W, height: H } = Dimensions.get('window');
// Questions per round is now in parent settings

// ─── STARFIELD ───────────────────────────────────────────────────────
const NUM_STARS = 90;
const NUM_SHOOTING = 3;

function StarField() {
  const stars = useRef(
    Array.from({ length: NUM_STARS }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.7;
      return {
        angle,
        speed,
        progress: Math.random(),
        maxSize: 2 + Math.random() * 4.5,
        opacity: new Animated.Value(0),
        hue: Math.random() > 0.7 ? `hsl(${200 + Math.random() * 60}, 80%, 85%)` : '#fff',
      };
    })
  ).current;

  const shootingStars = useRef(
    Array.from({ length: NUM_SHOOTING }, () => ({
      x: new Animated.Value(-100),
      y: new Animated.Value(-100),
      opacity: new Animated.Value(0),
    }))
  ).current;

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 40);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    stars.forEach(s => {
      s.progress += s.speed * 0.018;
      if (s.progress > 1) {
        s.progress = 0;
        s.angle = Math.random() * Math.PI * 2;
      }
      const o = s.progress < 0.05 ? s.progress / 0.05 * 0.4 : 0.4 + s.progress * 0.6;
      s.opacity.setValue(o);
    });
  }, [tick]);

  useEffect(() => {
    const launchShooting = (idx: number) => {
      const s = shootingStars[idx];
      const startX = Math.random() * W;
      const startY = Math.random() * H * 0.4;
      s.x.setValue(startX);
      s.y.setValue(startY);
      s.opacity.setValue(0);
      Animated.sequence([
        Animated.timing(s.opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(s.x, { toValue: startX + 200, duration: 600, useNativeDriver: true }),
          Animated.timing(s.y, { toValue: startY + 120, duration: 600, useNativeDriver: true }),
          Animated.timing(s.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]).start(() => {
        setTimeout(() => launchShooting(idx), 3000 + Math.random() * 8000);
      });
    };
    shootingStars.forEach((_, i) => {
      setTimeout(() => launchShooting(i), i * 4000 + Math.random() * 3000);
    });
  }, []);

  const cx = W / 2;
  const cy = H / 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s, i) => {
        const dist = s.progress * Math.max(W, H) * 0.8;
        const x = cx + Math.cos(s.angle) * dist;
        const y = cy + Math.sin(s.angle) * dist;
        const size = 0.5 + s.progress * s.maxSize;
        return (
          <Animated.View
            key={`s${i}`}
            style={{
              position: 'absolute',
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: s.hue,
              opacity: s.opacity,
              shadowColor: s.hue,
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: 6,
              shadowOpacity: 1,
            }}
          />
        );
      })}
      {shootingStars.map((s, i) => (
        <Animated.View
          key={`sh${i}`}
          style={{
            position: 'absolute',
            width: 30,
            height: 2,
            backgroundColor: '#fff',
            borderRadius: 1,
            opacity: s.opacity,
            transform: [
              { translateX: s.x },
              { translateY: s.y },
              { rotate: '30deg' },
            ],
            shadowColor: '#fff',
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 8,
            shadowOpacity: 1,
          }}
        />
      ))}
    </View>
  );
}

// ─── TRANSLATIONS ────────────────────────────────────────────────────
const T: Record<Language, Record<string, string>> = {
  en: {
    title: 'Planet Builders',
    subtitle: 'Build your world, power your mind!',
    chooseLanguage: 'Choose Language',
    english: 'English',
    german: 'Deutsch',
    selectPlayer: 'Select Player',
    newPlayer: '+ New Explorer',
    createExplorer: 'Create Explorer',
    enterName: 'Enter your name',
    age: 'Age Group',
    create: 'Launch!',
    back: 'Back',
    yourPlanet: "'s Planet",
    coins: 'Coins',
    level: 'Level',
    shop: 'Space Shop',
    missions: 'Missions',
    badgesBtn: 'Badges',
    biomes: 'Biomes',
    structures: 'Structures',
    creatures: 'Creatures',
    buy: 'Buy',
    owned: 'Owned',
    maths: 'Mission to Mars',
    spelling: 'Mission to Neptune',
    science: 'Mission to Jupiter',
    start: 'Start!',
    submit: 'Submit',
    next: 'Next',
    correct: 'Correct!',
    wrong: 'Not quite!',
    roundComplete: 'Round Complete!',
    amazing: 'Amazing work!',
    great: 'Great job!',
    good: 'Good effort!',
    playAgain: 'Play Again',
    backToPlanet: 'Back to Planet',
    score: 'Score',
    yourBadges: 'Your Badges',
    noBadges: 'Complete missions to earn badges!',
    planetAlert: 'ALERT!',
    goMission: 'Go on Mission!',
    dismiss: 'Not now',
    spellWord: 'Decode the transmission:',
    tryAgain: 'Try Again!',
    parentSettings: 'Parent Settings',
    enterPin: 'Enter PIN to access settings',
    pin: 'PIN',
    wrongPin: 'Wrong PIN',
    sessionLimit: 'Session Time Limit',
    noLimit: 'No limit',
    minutes: 'min',
    enabledMissions: 'Enabled Missions',
    questionsRound: 'Questions Per Round',
    resetProgress: 'Reset Progress',
    resetConfirm: 'This will reset all coins, XP, items and badges for this profile. Are you sure?',
    resetDone: 'Progress reset!',
    deleteProfile: 'Delete Profile',
    deleteConfirm: 'This will permanently delete this profile. Are you sure?',
    deleteDone: 'Profile deleted!',
    changePin: 'Change PIN',
    newPin: 'New 4-digit PIN',
    pinChanged: 'PIN changed!',
    save: 'Save',
    timeUp: 'Time is up!',
    timeUpMsg: 'Great job today! Time for a break.',
    ok: 'OK',
    welcomeBack: 'Welcome Back, Explorer!',
    creaturesFound: 'Your creatures explored while you were away and found',
    coinsWord: 'coins',
    awayBonus: 'Off-screen bonus!',
    collect: 'Collect!',
    questionNum: 'Question',
    of: 'of',
  },
  de: {
    title: 'Planeten-Bauer',
    subtitle: 'Bau deine Welt, stärke deinen Geist!',
    chooseLanguage: 'Sprache wählen',
    english: 'English',
    german: 'Deutsch',
    selectPlayer: 'Spieler wählen',
    newPlayer: '+ Neue Crew',
    createExplorer: 'Crew erstellen',
    enterName: 'Gib deinen Namen ein',
    age: 'Altersgruppe',
    create: 'Start!',
    back: 'Zurück',
    yourPlanet: "s Planet",
    coins: 'Münzen',
    level: 'Stufe',
    shop: 'Weltraum-Laden',
    missions: 'Missionen',
    badgesBtn: 'Abzeichen',
    biomes: 'Biome',
    structures: 'Gebäude',
    creatures: 'Kreaturen',
    buy: 'Kaufen',
    owned: 'Gekauft',
    maths: 'Mission zum Mars',
    spelling: 'Mission zum Neptun',
    science: 'Mission zum Jupiter',
    start: 'Los!',
    submit: 'Prüfen',
    next: 'Weiter',
    correct: 'Richtig!',
    wrong: 'Fast!',
    roundComplete: 'Runde geschafft!',
    amazing: 'Fantastisch!',
    great: 'Toll gemacht!',
    good: 'Gut gemacht!',
    playAgain: 'Nochmal spielen',
    backToPlanet: 'Zurück zum Planet',
    score: 'Punkte',
    yourBadges: 'Deine Abzeichen',
    noBadges: 'Schließe Missionen ab, um Abzeichen zu verdienen!',
    planetAlert: 'ALARM!',
    goMission: 'Zur Mission!',
    dismiss: 'Nicht jetzt',
    spellWord: 'Entschlüssle die Übertragung:',
    tryAgain: 'Nochmal!',
    parentSettings: 'Eltern-Einstellungen',
    enterPin: 'PIN eingeben für Einstellungen',
    pin: 'PIN',
    wrongPin: 'Falsche PIN',
    sessionLimit: 'Sitzungszeitlimit',
    noLimit: 'Kein Limit',
    minutes: 'Min',
    enabledMissions: 'Aktive Missionen',
    questionsRound: 'Fragen pro Runde',
    resetProgress: 'Fortschritt zurücksetzen',
    resetConfirm: 'Alle Münzen, XP, Gegenstände und Abzeichen werden zurückgesetzt. Bist du sicher?',
    resetDone: 'Fortschritt zurückgesetzt!',
    deleteProfile: 'Profil löschen',
    deleteConfirm: 'Dieses Profil wird dauerhaft gelöscht. Bist du sicher?',
    deleteDone: 'Profil gelöscht!',
    changePin: 'PIN ändern',
    newPin: 'Neue 4-stellige PIN',
    pinChanged: 'PIN geändert!',
    save: 'Speichern',
    timeUp: 'Zeit ist um!',
    timeUpMsg: 'Toll gemacht heute! Zeit für eine Pause.',
    ok: 'OK',
    welcomeBack: 'Willkommen zurück!',
    creaturesFound: 'Deine Kreaturen haben die Welt erkundet und gefunden',
    coinsWord: 'Münzen',
    awayBonus: 'Offline-Bonus!',
    collect: 'Einsammeln!',
    questionNum: 'Frage',
    of: 'von',
  },
};

// ─── GAME DATA ───────────────────────────────────────────────────────
const BIOME_NAMES: Record<Language, string[]> = {
  en: ['Crystal Desert', 'Mushroom Forest', 'Lava Fields', 'Ice Mountains', 'Candy Meadows', 'Ocean Depths'],
  de: ['Kristallwüste', 'Pilzwald', 'Lavafelder', 'Eisberge', 'Bonbon-Wiesen', 'Meerestiefe'],
};
const BIOME_COST = [0, 15, 30, 50, 75, 100];
const BIOME_EMOJI = ['🏜️', '🍄', '🌋', '🏔️', '🍬', '🌊'];

const STRUCTURE_NAMES: Record<Language, string[]> = {
  en: ['Space Tower', 'Rocket Pad', 'Crystal Dome', 'Star Bridge', 'Robot Factory', 'Tree Fort', 'Lava Slide', 'Moon Pool'],
  de: ['Weltraumturm', 'Raketenfeld', 'Kristallkuppel', 'Sternenbrücke', 'Roboterfabrik', 'Baumhaus', 'Lavarutsche', 'Mondpool'],
};
const STRUCTURE_COST = [5, 10, 15, 20, 30, 12, 25, 35];
const STRUCTURE_EMOJI = ['🗼', '🚀', '🔮', '🌉', '🤖', '🌳', '🎢', '🌙'];

const CREATURE_NAMES: Record<Language, string[]> = {
  en: ['Star Puppy', 'Moon Cat', 'Crystal Dragon', 'Lava Turtle', 'Cloud Bunny', 'Ice Phoenix', 'Candy Slime', 'Shadow Fox'],
  de: ['Sternenwelpe', 'Mondkatze', 'Kristalldrache', 'Lavaschildkröte', 'Wolkenhase', 'Eisphönix', 'Bonbon-Schleim', 'Schattenfuchs'],
};
const CREATURE_COST = [8, 8, 20, 18, 12, 35, 10, 25];
const CREATURE_EMOJI = ['🐶', '🐱', '🐉', '🐢', '🐰', '🦅', '🟢', '🦊'];

const ACTIVITY_NAMES: Record<Language, Record<string, string>> = {
  en: { maths: 'Mission to Mars', spelling: 'Mission to Neptune', science: 'Mission to Jupiter' },
  de: { maths: 'Mission zum Mars', spelling: 'Mission zum Neptun', science: 'Mission zum Jupiter' },
};

const CORRECT_MSGS: Record<Language, string[]> = {
  en: ['Brilliant! ⭐', 'You got it! 🚀', 'Amazing! 🎉', 'Super smart! 🧠', 'Woohoo! 🌟', 'Nailed it! 💫'],
  de: ['Genial! ⭐', 'Richtig! 🚀', 'Fantastisch! 🎉', 'Super schlau! 🧠', 'Juhu! 🌟', 'Perfekt! 💫'],
};

const WRONG_MSGS: Record<Language, string[]> = {
  en: [
    "Almost! You're learning! 💪",
    "Good try! Keep going! 🌟",
    "So close! You'll get the next one! 🚀",
    "Nice attempt! Every try makes you smarter! 🧠",
  ],
  de: [
    'Fast! Du lernst! 💪',
    'Guter Versuch! Weiter so! 🌟',
    'So nah dran! Du schaffst das! 🚀',
    'Toller Versuch! Jedes Mal wirst du schlauer! 🧠',
  ],
};

const FUN_FACTS: Record<Language, string[]> = {
  en: [
    '🪐 Jupiter is so big that 1,300 Earths could fit inside it!',
    '⭐ The Sun is actually a star — the closest one to Earth!',
    '🌙 The Moon has no wind, so footprints last forever!',
    '🚀 It takes about 3 days to travel to the Moon!',
    '🌍 Earth spins at over 1,000 miles per hour!',
    '💎 It rains diamonds on Neptune!',
    '🦕 Dinosaurs lived on Earth for 165 million years!',
    '🌊 More than 70% of Earth is covered in water!',
  ],
  de: [
    '🪐 Jupiter ist so groß, dass 1.300 Erden hineinpassen!',
    '⭐ Die Sonne ist ein Stern — der nächste zur Erde!',
    '🌙 Auf dem Mond gibt es keinen Wind — Fußabdrücke bleiben für immer!',
    '🚀 Eine Reise zum Mond dauert etwa 3 Tage!',
    '🌍 Die Erde dreht sich mit über 1.600 km/h!',
    '💎 Auf Neptun regnet es Diamanten!',
    '🦕 Dinosaurier lebten 165 Millionen Jahre auf der Erde!',
    '🌊 Über 70% der Erde ist mit Wasser bedeckt!',
  ],
};

// ─── AGE-SPECIFIC CONFIG ─────────────────────────────────────────────
interface AgeConfig {
  mathRange: [number, number];
  mathOps: string[];
  spellingLen: [number, number];
  xpPerCorrect: number;
  coinsPerCorrect: number;
}

const AGE_CONFIGS: Record<AgeGroup, AgeConfig> = {
  '4-5': { mathRange: [1, 5], mathOps: ['+'], spellingLen: [2, 3], xpPerCorrect: 15, coinsPerCorrect: 8 },
  '6-7': { mathRange: [1, 10], mathOps: ['+', '-'], spellingLen: [3, 5], xpPerCorrect: 12, coinsPerCorrect: 6 },
  '8-9': { mathRange: [1, 20], mathOps: ['+', '-', '×'], spellingLen: [4, 7], xpPerCorrect: 10, coinsPerCorrect: 5 },
  '10-11': { mathRange: [2, 50], mathOps: ['+', '-', '×', '÷'], spellingLen: [5, 9], xpPerCorrect: 8, coinsPerCorrect: 4 },
};

// ─── SPELLING WORDS ──────────────────────────────────────────────────
const SPELLING_WORDS: Record<Language, Record<AgeGroup, string[]>> = {
  en: {
    '4-5': ['cat', 'dog', 'sun', 'cup', 'hat', 'red', 'big', 'run', 'sit', 'hop'],
    '6-7': ['star', 'moon', 'tree', 'fish', 'bird', 'rock', 'jump', 'blue', 'green', 'happy', 'water', 'plant'],
    '8-9': ['planet', 'rocket', 'galaxy', 'crystal', 'dragon', 'explore', 'science', 'thunder', 'volcano', 'diamond'],
    '10-11': ['atmosphere', 'constellation', 'laboratory', 'telescope', 'experiment', 'photosynthesis', 'electricity', 'temperature', 'environment', 'archaeology'],
  },
  de: {
    '4-5': ['Eis', 'Hut', 'Tor', 'Uhr', 'Rot', 'Arm', 'Ohr', 'Tür', 'Rad', 'Bus'],
    '6-7': ['Mond', 'Baum', 'Fisch', 'Stern', 'Vogel', 'Blume', 'Wolke', 'Sonne', 'Garten', 'Schule'],
    '8-9': ['Rakete', 'Planet', 'Kristall', 'Drache', 'Vulkan', 'Diamant', 'Roboter', 'Wasser', 'Donner', 'Galaxie'],
    '10-11': ['Atmosphäre', 'Sternbild', 'Laboratorium', 'Teleskop', 'Experiment', 'Fotosynthese', 'Elektrizität', 'Temperatur', 'Umwelt', 'Archäologie'],
  },
};

// ─── SCIENCE QUESTIONS ───────────────────────────────────────────────
interface ScienceQ {
  q: string;
  options: string[];
  correct: number;
  fact?: string;
}

const SCIENCE_QUESTIONS: Record<Language, Record<AgeGroup, ScienceQ[]>> = {
  en: {
    '4-5': [
      { q: 'What colour is the sky?', options: ['Blue', 'Green', 'Red'], correct: 0, fact: 'The sky looks blue because of how sunlight bounces around!' },
      { q: 'What do plants need to grow?', options: ['Water', 'Candy', 'Toys'], correct: 0, fact: 'Plants drink water through their roots like a straw!' },
      { q: 'Which is bigger?', options: ['Elephant', 'Cat', 'Mouse'], correct: 0 },
      { q: 'What sound does a cow make?', options: ['Moo', 'Woof', 'Meow'], correct: 0 },
      { q: 'What is hot?', options: ['Fire', 'Ice', 'Snow'], correct: 0, fact: 'Fire can be over 1,000 degrees!' },
      { q: 'Where do fish live?', options: ['Water', 'Trees', 'Clouds'], correct: 0 },
    ],
    '6-7': [
      { q: 'Which planet is closest to the Sun?', options: ['Mercury', 'Earth', 'Mars', 'Jupiter'], correct: 0, fact: 'Mercury is super hot — up to 430°C during the day!' },
      { q: 'What do bees make?', options: ['Honey', 'Milk', 'Bread', 'Juice'], correct: 0, fact: 'One bee makes only 1/12 teaspoon of honey in its life!' },
      { q: 'How many legs does a spider have?', options: ['6', '8', '10', '4'], correct: 1 },
      { q: 'What is ice made of?', options: ['Water', 'Air', 'Sand', 'Light'], correct: 0, fact: 'Water expands when it freezes — that\'s why ice floats!' },
      { q: 'Which animal is the fastest?', options: ['Cheetah', 'Elephant', 'Turtle', 'Dog'], correct: 0, fact: 'Cheetahs can run as fast as a car on the motorway!' },
      { q: 'What gives us light during the day?', options: ['The Sun', 'The Moon', 'Stars', 'Lamps'], correct: 0 },
    ],
    '8-9': [
      { q: 'What is the largest planet in our solar system?', options: ['Jupiter', 'Saturn', 'Neptune', 'Earth'], correct: 0, fact: 'Jupiter has a giant storm called the Great Red Spot — bigger than Earth!' },
      { q: 'What gas do plants breathe in?', options: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Helium'], correct: 0, fact: 'Plants turn CO₂ into oxygen — they clean our air!' },
      { q: 'What force keeps us on the ground?', options: ['Gravity', 'Magnetism', 'Wind', 'Friction'], correct: 0 },
      { q: 'How many bones does a human have?', options: ['206', '100', '300', '50'], correct: 0, fact: 'Babies have about 270 bones — some fuse together as you grow!' },
      { q: 'What is the hardest natural material?', options: ['Diamond', 'Iron', 'Gold', 'Wood'], correct: 0 },
      { q: 'Which planet has rings?', options: ['Saturn', 'Mars', 'Venus', 'Mercury'], correct: 0, fact: 'Saturn\'s rings are made of ice and rock!' },
    ],
    '10-11': [
      { q: 'What is the speed of light?', options: ['300,000 km/s', '150,000 km/s', '1,000 km/s', '30,000 km/s'], correct: 0, fact: 'Light could travel around Earth 7.5 times in one second!' },
      { q: 'What is the closest star to Earth (besides the Sun)?', options: ['Proxima Centauri', 'Sirius', 'Betelgeuse', 'Polaris'], correct: 0, fact: 'Proxima Centauri is 4.24 light-years away — it would take 73,000 years to fly there!' },
      { q: 'What causes tides on Earth?', options: ["The Moon's gravity", 'Wind', "The Sun's heat", "Earth's rotation"], correct: 0, fact: 'The Moon pulls on Earth\'s oceans, creating high and low tides twice a day!' },
      { q: 'What are the building blocks of all matter?', options: ['Atoms', 'Cells', 'Molecules', 'Electrons'], correct: 0, fact: 'There are more atoms in a glass of water than glasses of water in all the oceans!' },
      { q: 'What layer of the atmosphere protects us from UV rays?', options: ['Ozone layer', 'Troposphere', 'Mesosphere', 'Exosphere'], correct: 0 },
      { q: 'What is the chemical formula for water?', options: ['H₂O', 'CO₂', 'O₂', 'NaCl'], correct: 0, fact: 'Every water molecule has 2 hydrogen atoms and 1 oxygen atom!' },
    ],
  },
  de: {
    '4-5': [
      { q: 'Welche Farbe hat der Himmel?', options: ['Blau', 'Grün', 'Rot'], correct: 0, fact: 'Der Himmel sieht blau aus, weil Sonnenlicht herumhüpft!' },
      { q: 'Was brauchen Pflanzen zum Wachsen?', options: ['Wasser', 'Bonbons', 'Spielzeug'], correct: 0, fact: 'Pflanzen trinken Wasser durch ihre Wurzeln wie mit einem Strohhalm!' },
      { q: 'Was ist größer?', options: ['Elefant', 'Katze', 'Maus'], correct: 0 },
      { q: 'Welches Geräusch macht eine Kuh?', options: ['Muh', 'Wau', 'Miau'], correct: 0 },
      { q: 'Was ist heiß?', options: ['Feuer', 'Eis', 'Schnee'], correct: 0, fact: 'Feuer kann über 1.000 Grad heiß sein!' },
      { q: 'Wo leben Fische?', options: ['Wasser', 'Bäume', 'Wolken'], correct: 0 },
    ],
    '6-7': [
      { q: 'Welcher Planet ist der Sonne am nächsten?', options: ['Merkur', 'Erde', 'Mars', 'Jupiter'], correct: 0, fact: 'Merkur ist super heiß — bis zu 430°C am Tag!' },
      { q: 'Was machen Bienen?', options: ['Honig', 'Milch', 'Brot', 'Saft'], correct: 0, fact: 'Eine Biene macht nur 1/12 Teelöffel Honig in ihrem Leben!' },
      { q: 'Wie viele Beine hat eine Spinne?', options: ['6', '8', '10', '4'], correct: 1 },
      { q: 'Woraus besteht Eis?', options: ['Wasser', 'Luft', 'Sand', 'Licht'], correct: 0, fact: 'Wasser dehnt sich aus, wenn es gefriert — deshalb schwimmt Eis!' },
      { q: 'Welches Tier ist am schnellsten?', options: ['Gepard', 'Elefant', 'Schildkröte', 'Hund'], correct: 0, fact: 'Geparden können so schnell rennen wie ein Auto auf der Autobahn!' },
      { q: 'Was gibt uns tagsüber Licht?', options: ['Die Sonne', 'Der Mond', 'Sterne', 'Lampen'], correct: 0 },
    ],
    '8-9': [
      { q: 'Was ist der größte Planet in unserem Sonnensystem?', options: ['Jupiter', 'Saturn', 'Neptun', 'Erde'], correct: 0, fact: 'Jupiter hat einen riesigen Sturm — den Großen Roten Fleck — größer als die Erde!' },
      { q: 'Welches Gas atmen Pflanzen ein?', options: ['Kohlendioxid', 'Sauerstoff', 'Stickstoff', 'Helium'], correct: 0, fact: 'Pflanzen verwandeln CO₂ in Sauerstoff — sie reinigen unsere Luft!' },
      { q: 'Welche Kraft hält uns am Boden?', options: ['Schwerkraft', 'Magnetismus', 'Wind', 'Reibung'], correct: 0 },
      { q: 'Wie viele Knochen hat ein Mensch?', options: ['206', '100', '300', '50'], correct: 0, fact: 'Babys haben etwa 270 Knochen — manche wachsen zusammen!' },
      { q: 'Was ist das härteste natürliche Material?', options: ['Diamant', 'Eisen', 'Gold', 'Holz'], correct: 0 },
      { q: 'Welcher Planet hat Ringe?', options: ['Saturn', 'Mars', 'Venus', 'Merkur'], correct: 0, fact: 'Saturns Ringe bestehen aus Eis und Gestein!' },
    ],
    '10-11': [
      { q: 'Wie schnell ist das Licht?', options: ['300.000 km/s', '150.000 km/s', '1.000 km/s', '30.000 km/s'], correct: 0, fact: 'Licht könnte in einer Sekunde 7,5 Mal um die Erde reisen!' },
      { q: 'Welcher Stern ist der Erde am nächsten (außer der Sonne)?', options: ['Proxima Centauri', 'Sirius', 'Beteigeuze', 'Polaris'], correct: 0, fact: 'Proxima Centauri ist 4,24 Lichtjahre entfernt — man bräuchte 73.000 Jahre um hinzufliegen!' },
      { q: 'Was verursacht Gezeiten auf der Erde?', options: ['Die Schwerkraft des Mondes', 'Wind', 'Die Hitze der Sonne', 'Die Erdrotation'], correct: 0, fact: 'Der Mond zieht an den Ozeanen und erzeugt zweimal täglich Ebbe und Flut!' },
      { q: 'Was sind die Bausteine aller Materie?', options: ['Atome', 'Zellen', 'Moleküle', 'Elektronen'], correct: 0, fact: 'In einem Glas Wasser sind mehr Atome als Gläser Wasser in allen Ozeanen!' },
      { q: 'Welche Schicht der Atmosphäre schützt uns vor UV-Strahlen?', options: ['Ozonschicht', 'Troposphäre', 'Mesosphäre', 'Exosphäre'], correct: 0 },
      { q: 'Was ist die chemische Formel für Wasser?', options: ['H₂O', 'CO₂', 'O₂', 'NaCl'], correct: 0, fact: 'Jedes Wassermolekül hat 2 Wasserstoff- und 1 Sauerstoffatom!' },
    ],
  },
};

// ─── BADGES ──────────────────────────────────────────────────────────
const BADGES: Badge[] = [
  { id: 'first_mission', name: { en: 'First Mission', de: 'Erste Mission' }, desc: { en: 'Complete your first question', de: 'Beantworte deine erste Frage' }, check: p => (p.stats.maths + p.stats.spelling + p.stats.science) >= 1 },
  { id: 'maths_5', name: { en: 'Maths Whiz', de: 'Mathe-Genie' }, desc: { en: 'Answer 5 maths questions', de: '5 Mathe-Fragen beantwortet' }, check: p => p.stats.maths >= 5 },
  { id: 'spelling_5', name: { en: 'Word Wizard', de: 'Wort-Magie' }, desc: { en: 'Answer 5 spelling questions', de: '5 Rechtschreib-Fragen beantwortet' }, check: p => p.stats.spelling >= 5 },
  { id: 'science_5', name: { en: 'Science Star', de: 'Wissenschafts-Star' }, desc: { en: 'Answer 5 science questions', de: '5 Wissenschafts-Fragen beantwortet' }, check: p => p.stats.science >= 5 },
  { id: 'combo_3', name: { en: 'Hot Streak', de: 'Serie' }, desc: { en: '3 correct in a row!', de: '3 richtige hintereinander!' }, check: p => p.bestCombo >= 3 },
  { id: 'combo_5', name: { en: 'Unstoppable', de: 'Unaufhaltbar' }, desc: { en: '5 correct in a row!', de: '5 richtige hintereinander!' }, check: p => p.bestCombo >= 5 },
  { id: 'rich', name: { en: 'Space Rich', de: 'Weltraum-Reich' }, desc: { en: 'Earn 100 coins total', de: '100 Münzen gesammelt' }, check: p => p.coins >= 100 },
  { id: 'builder', name: { en: 'Master Builder', de: 'Bau-Profi' }, desc: { en: 'Own 3 structures', de: '3 Gebäude besitzen' }, check: p => p.structures.length >= 3 },
  { id: 'level5', name: { en: 'Level 5 Star', de: 'Stufe 5 Star' }, desc: { en: 'Reach level 5', de: 'Stufe 5 erreichen' }, check: p => p.level >= 5 },
  { id: 'all_missions', name: { en: 'Triple Threat', de: 'Dreifach-Bedrohung' }, desc: { en: 'Try all 3 mission types', de: 'Alle 3 Missionstypen probiert' }, check: p => p.stats.maths > 0 && p.stats.spelling > 0 && p.stats.science > 0 },
];

const BADGE_EMOJI: Record<string, string> = {
  first_mission: '🎯', maths_5: '🧮', spelling_5: '📝', science_5: '🔬',
  combo_3: '🔥', combo_5: '⚡', rich: '💰', builder: '🏗️', level5: '🏆', all_missions: '🌟',
};

// ─── PLANET EVENTS ───────────────────────────────────────────────────
const PLANET_EVENTS: PlanetEvent[] = [
  { id: 'meteor', mission: 'maths', message: { en: '☄️ A meteor is heading for your planet! Quick — solve maths problems to power the shield!', de: '☄️ Ein Meteor steuert auf deinen Planeten zu! Schnell — löse Mathe-Aufgaben um den Schild zu aktivieren!' } },
  { id: 'alien_msg', mission: 'spelling', message: { en: '👽 An alien is trying to send you a message! Spell words correctly to decode it!', de: '👽 Ein Alien sendet dir eine Nachricht! Buchstabiere Wörter richtig um sie zu entschlüsseln!' } },
  { id: 'blackhole', mission: 'science', message: { en: '🌀 A black hole appeared near your planet! Answer science questions to stabilise the orbit!', de: '🌀 Ein schwarzes Loch ist neben deinem Planeten aufgetaucht! Beantworte Wissenschaftsfragen um die Umlaufbahn zu stabilisieren!' } },
  { id: 'power_out', mission: 'maths', message: { en: '⚡ Power failure on your planet! Solve maths to restart the generators!', de: '⚡ Stromausfall auf deinem Planeten! Löse Mathe-Aufgaben um die Generatoren zu starten!' } },
  { id: 'creature_lost', mission: 'spelling', message: { en: '🐾 One of your creatures is lost! Spell the rescue coordinates to find them!', de: '🐾 Eine deiner Kreaturen ist verloren! Buchstabiere die Rettungskoordinaten!' } },
  { id: 'volcano', mission: 'science', message: { en: '🌋 The volcano is about to erupt! Use your science knowledge to divert the lava!', de: '🌋 Der Vulkan bricht gleich aus! Nutze dein Wissen, um die Lava umzuleiten!' } },
];

// ─── COLORS ──────────────────────────────────────────────────────────
const COLORS = {
  space: '#0a0a2e',
  panel: 'rgba(20, 20, 60, 0.85)',
  accent: '#7c4dff',
  accentLight: '#b388ff',
  gold: '#ffd700',
  success: '#69f0ae',
  error: '#ff6b6b',
  text: '#ffffff',
  textDim: 'rgba(255,255,255,0.6)',
  cardBg: 'rgba(255,255,255,0.08)',
};

// ─── HELPERS ─────────────────────────────────────────────────────────
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function xpForLevel(lv: number) { return lv * 30; }

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const matching = voices.filter(v => v.lang.startsWith(lang));
  return matching.find(v => v.default) || matching[0] || null;
}

const AGE_SPEECH: Record<AgeGroup, { rate: number; spellOnLoad: boolean; spellOnTap: boolean }> = {
  '4-5':  { rate: 0.75, spellOnLoad: true,  spellOnTap: true },
  '6-7':  { rate: 0.85, spellOnLoad: true,  spellOnTap: true },
  '8-9':  { rate: 0.9,  spellOnLoad: false, spellOnTap: true },
  '10-11': { rate: 0.95, spellOnLoad: false, spellOnTap: false },
};

function makeUtterance(text: string, fullTag: string, voice: SpeechSynthesisVoice | null, rate = 0.9): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = fullTag;
  if (voice) u.voice = voice;
  u.rate = rate;
  u.pitch = 1.1;
  u.volume = 0.8;
  return u;
}

function speakWord(word: string, language: Language, spellOut = false, age: AgeGroup = '6-7') {
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const langTag = language === 'de' ? 'de' : 'en';
      const fullTag = language === 'de' ? 'de-DE' : 'en-GB';
      const voice = pickVoice(langTag);
      const { rate } = AGE_SPEECH[age];

      // 1. Say the whole word
      const u1 = makeUtterance(word, fullTag, voice, rate);
      u1.onend = () => {
        if (spellOut) {
          // 2. Spell it out letter by letter
          let i = 0;
          const letters = word.split('');
          function speakNextLetter() {
            if (i >= letters.length) {
              // 3. Say the whole word once more after spelling
              setTimeout(() => {
                window.speechSynthesis.speak(makeUtterance(word, fullTag, voice, rate));
              }, 600);
              return;
            }
            setTimeout(() => {
              const letterU = makeUtterance(letters[i], fullTag, voice, rate * 0.9);
              letterU.onend = () => { i++; speakNextLetter(); };
              window.speechSynthesis.speak(letterU);
            }, 350);
          }
          setTimeout(speakNextLetter, 800);
        } else {
          // Simple repeat
          setTimeout(() => {
            window.speechSynthesis.speak(makeUtterance(word, fullTag, voice, rate));
          }, 1200);
        }
      };
      window.speechSynthesis.speak(u1);
    }
  } catch (_e) {
    console.warn('Text-to-speech unavailable');
  }
}

function getSpellingHint(word: string, tries: number, age: AgeGroup): string {
  const len = word.length;
  if (age === '10-11') return '';
  if (age === '8-9') {
    // Older kids: just first letter on any wrong attempt
    return word[0] + ' _ '.repeat(len - 1).trim();
  }
  // Ages 4-7: progressive hints
  if (tries === 1) {
    if (age === '4-5' && len > 2) {
      // Youngest: show first two letters
      return word[0] + ' ' + word[1] + ' _ '.repeat(len - 2).trim();
    }
    return word[0] + ' _ '.repeat(len - 1).trim();
  }
  // 2nd wrong attempt
  if (len <= 2) return word;
  if (age === '4-5') {
    // Youngest: show first two + last letter
    return word[0] + ' ' + word[1] + ' _ '.repeat(Math.max(0, len - 3)).trim() + ' ' + word[len - 1];
  }
  return word[0] + ' _ '.repeat(len - 2).trim() + ' ' + word[len - 1];
}

function generateMathQ(cfg: AgeConfig): { question: string; answer: number } {
  const op = pick(cfg.mathOps);
  let a = rand(cfg.mathRange[0], cfg.mathRange[1]);
  let b = rand(cfg.mathRange[0], cfg.mathRange[1]);
  if (op === '-' && b > a) [a, b] = [b, a];
  if (op === '÷') {
    // Ensure clean division: pick answer first, then multiply
    const ans = rand(2, 10);
    b = rand(2, 8);
    a = ans * b;
  }
  let answer: number;
  switch (op) {
    case '+': answer = a + b; break;
    case '-': answer = a - b; break;
    case '×': answer = a * b; break;
    case '÷': answer = a / b; break;
    default: answer = a + b;
  }
  return { question: `${a} ${op} ${b} = ?`, answer };
}

function checkBadges(profile: Profile): string[] {
  const newBadges: string[] = [];
  BADGES.forEach(b => {
    if (!profile.badges.includes(b.id) && b.check(profile)) {
      newBadges.push(b.id);
    }
  });
  return newBadges;
}

// ─── MAIN APP ────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>('languageSelect');
  const [lang, setLang] = useState<Language>('en');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState<AgeGroup>('6-7');

  // Mission state
  const [missionType, setMissionType] = useState<'maths' | 'spelling' | 'science'>('maths');
  const [mathQ, setMathQ] = useState({ question: '', answer: 0 });
  const [spellingWord, setSpellingWord] = useState('');
  const [scienceQ, setScienceQ] = useState<ScienceQ | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [tries, setTries] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState(COLORS.success);
  const [showFact, setShowFact] = useState('');

  // Session / round tracking
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [showRoundComplete, setShowRoundComplete] = useState(false);

  // Planet events
  const [planetEvent, setPlanetEvent] = useState<PlanetEvent | null>(null);
  const planetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Badge popup
  const [badgePopup, setBadgePopup] = useState<string[]>([]);

  // Parent settings
  const [settings, setSettings] = useState<ParentSettings>({ ...DEFAULT_SETTINGS });
  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState(false);
  const [newPinEntry, setNewPinEntry] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Confirm dialog (replaces Alert.alert which doesn't work on web)
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Offline rewards
  const [offlineReward, setOfflineReward] = useState<{ coins: number; profileIdx: number } | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const t = useCallback((key: string) => T[lang][key] || key, [lang]);
  const profile = profiles[currentIdx] as Profile | undefined;

  // ─── PERSISTENCE ─────────────────────────────────────────────────
  // Load saved data on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await Storage.getItem('planetbuilders_data');
        if (saved) {
          const data = JSON.parse(saved);
          if (data.profiles) setProfiles(data.profiles);
          if (data.lang) setLang(data.lang);
          if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        }
      } catch (e) {}
      setDataLoaded(true);
    })();
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    if (!dataLoaded) return;
    Storage.setItem('planetbuilders_data', JSON.stringify({
      profiles,
      lang,
      settings,
      lastActive: Date.now(),
    })).catch(() => {});
  }, [profiles, lang, settings, dataLoaded]);

  // Session time limit
  useEffect(() => {
    if (screen === 'planet' && settings.sessionMinutes > 0 && !sessionStartTime) {
      setSessionStartTime(Date.now());
    }
  }, [screen]);

  useEffect(() => {
    if (sessionStartTime && settings.sessionMinutes > 0) {
      sessionTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - sessionStartTime) / 60000;
        if (elapsed >= settings.sessionMinutes) {
          setShowTimeUp(true);
          if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
        }
      }, 10000);
      return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
    }
  }, [sessionStartTime, settings.sessionMinutes]);

  // Check for offline reward when selecting a profile
  const checkOfflineReward = useCallback(async (idx: number) => {
    try {
      const saved = await Storage.getItem('planetbuilders_data');
      if (!saved) return;
      const data = JSON.parse(saved);
      const lastActive = data.lastActive;
      if (!lastActive) return;

      const awayMinutes = (Date.now() - lastActive) / 60000;
      if (awayMinutes >= 30) {
        // 1 coin per 10 minutes away, max 50 coins
        const bonus = Math.min(50, Math.floor(awayMinutes / 10));
        if (bonus > 0) {
          setOfflineReward({ coins: bonus, profileIdx: idx });
        }
      }
    } catch (e) {}
  }, []);

  // ─── PLANET EVENT TIMER ──────────────────────────────────────────
  useEffect(() => {
    if (screen === 'planet' && profile) {
      const delay = 30000 + Math.random() * 60000; // 30-90 seconds
      planetTimerRef.current = setTimeout(() => {
        setPlanetEvent(pick(PLANET_EVENTS));
      }, delay);
      return () => {
        if (planetTimerRef.current) clearTimeout(planetTimerRef.current);
      };
    }
  }, [screen, currentIdx]);

  // ─── PROFILE HELPERS ─────────────────────────────────────────────
  function createProfile() {
    if (!newName.trim()) return;
    const p: Profile = {
      name: newName.trim(),
      age: newAge,
      language: lang,
      coins: 20, xp: 0, level: 1,
      biome: lang === 'en' ? 'Crystal Desert' : 'Kristallwüste',
      structures: [], creatures: [],
      stats: { maths: 0, spelling: 0, science: 0 },
      badges: [],
      combo: 0, bestCombo: 0,
    };
    const newProfiles = [...profiles, p];
    setProfiles(newProfiles);
    setCurrentIdx(newProfiles.length - 1);
    setNewName('');
    setScreen('planet');
  }

  function updateProfile(updated: Profile) {
    const newProfiles = [...profiles];
    newProfiles[currentIdx] = updated;
    setProfiles(newProfiles);
  }

  function collectOfflineReward() {
    if (!offlineReward) return;
    const idx = offlineReward.profileIdx;
    const updated = { ...profiles[idx] };
    updated.coins += offlineReward.coins;
    const newProfiles = [...profiles];
    newProfiles[idx] = updated;
    setProfiles(newProfiles);
    setOfflineReward(null);
  }

  // ─── MISSION SETUP ──────────────────────────────────────────────
  function startMission(type: 'maths' | 'spelling' | 'science') {
    setMissionType(type);
    setSessionCorrect(0);
    setSessionTotal(0);
    setShowRoundComplete(false);
    setFeedback('');
    setShowFact('');
    setUserAnswer('');
    loadQuestion(type);
    setScreen('missionPlay');
  }

  function loadQuestion(type: 'maths' | 'spelling' | 'science') {
    if (!profile) return;
    const cfg = AGE_CONFIGS[profile.age];
    setFeedback('');
    setShowFact('');
    setUserAnswer('');
    setTries(0);

    if (type === 'maths') {
      setMathQ(generateMathQ(cfg));
    } else if (type === 'spelling') {
      const words = SPELLING_WORDS[lang][profile.age];
      const word = pick(words);
      setSpellingWord(word);
      const shouldSpell = AGE_SPEECH[profile.age].spellOnLoad;
      setTimeout(() => speakWord(word, lang, shouldSpell, profile.age), 400);
    } else {
      const qs = SCIENCE_QUESTIONS[lang][profile.age];
      setScienceQ(pick(qs));
    }
  }

  // ─── ANSWER HANDLING ────────────────────────────────────────────
  function answerQuestion(selectedAnswer?: number) {
    if (!profile) return;
    const cfg = AGE_CONFIGS[profile.age];
    let isCorrect = false;

    if (missionType === 'maths') {
      isCorrect = parseInt(userAnswer) === mathQ.answer;
    } else if (missionType === 'spelling') {
      isCorrect = userAnswer.trim().toLowerCase() === spellingWord.toLowerCase();
    } else if (missionType === 'science' && scienceQ) {
      isCorrect = selectedAnswer === scienceQ.correct;
    }

    if (!isCorrect) {
      const newTries = tries + 1;
      setTries(newTries);
      setFeedbackColor(COLORS.error);
      const updated = { ...profile, combo: 0 };
      updateProfile(updated);

      if (newTries >= 3) {
        // 3rd try — reveal the answer and move on
        setFeedback(pick(WRONG_MSGS[lang]));
        if (missionType === 'maths') {
          setShowFact(`${t('correct')}: ${mathQ.answer}`);
        } else if (missionType === 'spelling') {
          setShowFact(`${t('correct')}: ${spellingWord}`);
        } else if (scienceQ) {
          setShowFact(`${t('correct')}: ${scienceQ.options[scienceQ.correct]}`);
        }
        // Count it and move on (feedbackColor stays error so "Next" shows)
        setFeedbackColor('revealed' as any);
        setSessionTotal(sessionTotal + 1);
      } else {
        // Still have tries left — show progressive hint for spelling
        setFeedback(pick(WRONG_MSGS[lang]));
        if (missionType === 'spelling' && profile) {
          const hint = getSpellingHint(spellingWord, newTries, profile.age);
          setShowFact(hint);
          speakWord(spellingWord, lang, AGE_SPEECH[profile.age].spellOnTap, profile.age);
        } else {
          setShowFact('');
        }
      }
      return;
    }

    // Correct — build updated profile in one go
    const updated = { ...profile };
    const newTotal = sessionTotal + 1;
    const newCorrect = sessionCorrect + 1;

    setFeedback(pick(CORRECT_MSGS[lang]));
    setFeedbackColor(COLORS.success);

    // Update stats
    updated.stats = { ...updated.stats };
    updated.stats[missionType] = (updated.stats[missionType] || 0) + 1;

    // Coins & XP
    updated.coins += cfg.coinsPerCorrect;
    updated.xp += cfg.xpPerCorrect;

    // Combo
    updated.combo = (updated.combo || 0) + 1;
    if (updated.combo > (updated.bestCombo || 0)) {
      updated.bestCombo = updated.combo;
    }

    // Level up
    while (updated.xp >= xpForLevel(updated.level)) {
      updated.xp -= xpForLevel(updated.level);
      updated.level += 1;
    }

    // Fun fact
    if (missionType === 'science' && scienceQ?.fact) {
      setShowFact(scienceQ.fact);
    } else {
      setShowFact(pick(FUN_FACTS[lang]));
    }

    // Check badges once on the fully updated profile
    const newBadges = checkBadges(updated);
    if (newBadges.length > 0) {
      updated.badges = [...updated.badges, ...newBadges];
      setBadgePopup(newBadges);
      setTimeout(() => setBadgePopup([]), 3000);
    }

    updateProfile(updated);
    setSessionCorrect(newCorrect);
    setSessionTotal(newTotal);
  }

  function handleNextQuestion() {
    if (sessionTotal >= settings.questionsPerRound) {
      setShowRoundComplete(true);
    } else {
      loadQuestion(missionType);
    }
  }

  // ─── SHOP PURCHASE ──────────────────────────────────────────────
  function buyItem(type: 'biome' | 'structure' | 'creature', index: number) {
    if (!profile) return;
    const updated = { ...profile };
    if (type === 'biome') {
      if (updated.coins < BIOME_COST[index]) return;
      updated.coins -= BIOME_COST[index];
      updated.biome = BIOME_NAMES[lang][index];
    } else if (type === 'structure') {
      const name = STRUCTURE_NAMES[lang][index];
      if (updated.structures.includes(name) || updated.coins < STRUCTURE_COST[index]) return;
      updated.coins -= STRUCTURE_COST[index];
      updated.structures = [...updated.structures, name];
    } else {
      const name = CREATURE_NAMES[lang][index];
      if (updated.creatures.includes(name) || updated.coins < CREATURE_COST[index]) return;
      updated.coins -= CREATURE_COST[index];
      updated.creatures = [...updated.creatures, name];
    }

    // Check badges after purchase
    const newBadges = checkBadges(updated);
    if (newBadges.length > 0) {
      updated.badges = [...updated.badges, ...newBadges];
      setBadgePopup(newBadges);
      setTimeout(() => setBadgePopup([]), 3000);
    }

    updateProfile(updated);
  }

  // ─── RENDER HELPERS ──────────────────────────────────────────────
  function renderProgressDots() {
    return (
      <View style={styles.progressRow}>
        <Text style={styles.questionCount}>
          {t('questionNum')} {sessionTotal + 1} {t('of')} {settings.questionsPerRound}
        </Text>
        <View style={styles.dotsRow}>
          {Array.from({ length: settings.questionsPerRound }, (_, i) => {
            let color = COLORS.cardBg;
            if (i < sessionTotal) {
              color = i < sessionCorrect ? COLORS.success : COLORS.error;
            } else if (i === sessionTotal) {
              color = COLORS.accentLight;
            }
            return <View key={i} style={[styles.dot, { backgroundColor: color }]} />;
          })}
        </View>
      </View>
    );
  }

  function renderRoundComplete() {
    const pct = sessionTotal > 0 ? sessionCorrect / sessionTotal : 0;
    const stars = pct >= 0.8 ? 3 : pct >= 0.5 ? 2 : 1;
    const msg = stars === 3 ? t('amazing') : stars === 2 ? t('great') : t('good');

    return (
      <View style={styles.container}>
        <StarField />
        <View style={styles.centerContent}>
          <Text style={styles.roundTitle}>{t('roundComplete')}</Text>
          <Text style={{ fontSize: 50, textAlign: 'center', marginVertical: 10 }}>
            {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}
          </Text>
          <Text style={styles.roundMsg}>{msg}</Text>
          <Text style={styles.roundScore}>
            {t('score')}: {sessionCorrect} / {sessionTotal}
          </Text>
          <View style={styles.roundBtns}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: COLORS.success }]}
              onPress={() => startMission(missionType)}
            >
              <Text style={styles.btnText}>{t('playAgain')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: COLORS.accent }]}
              onPress={() => setScreen('planet')}
            >
              <Text style={styles.btnText}>{t('backToPlanet')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ─── BADGE POPUP ─────────────────────────────────────────────────
  function renderBadgePopup() {
    if (badgePopup.length === 0) return null;
    return (
      <View style={styles.badgePopup}>
        {badgePopup.map(bid => {
          const badge = BADGES.find(b => b.id === bid);
          if (!badge) return null;
          return (
            <View key={bid} style={styles.badgePopupItem}>
              <Text style={{ fontSize: 30 }}>{BADGE_EMOJI[bid] || '🏅'}</Text>
              <Text style={styles.badgePopupText}>{badge.name[lang]}!</Text>
            </View>
          );
        })}
      </View>
    );
  }

  // ─── OFFLINE REWARD MODAL ────────────────────────────────────────
  // ─── CONFIRM DIALOG MODAL ────────────────────────────────────────
  function renderConfirmDialog() {
    if (!confirmDialog) return null;
    return (
      <Modal transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.eventCard, { borderColor: COLORS.error }]}>
            <Text style={[styles.eventAlertText, { color: COLORS.error }]}>{confirmDialog.title}</Text>
            <Text style={styles.eventMessage}>{confirmDialog.message}</Text>
            <View style={styles.eventBtns}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: COLORS.error, flex: 1, marginRight: 8 }]}
                onPress={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
              >
                <Text style={styles.btnText}>{t('ok')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: COLORS.cardBg, flex: 1 }]}
                onPress={() => setConfirmDialog(null)}
              >
                <Text style={styles.btnText}>{t('back')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function renderOfflineReward() {
    if (!offlineReward) return null;
    const p = profiles[offlineReward.profileIdx];
    const creatureEmojis = p?.creatures.length
      ? p.creatures.map(c => { const idx = CREATURE_NAMES[lang].indexOf(c); return CREATURE_EMOJI[idx] || '🐾'; }).join(' ')
      : '🐾';
    return (
      <Modal transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.eventCard, { borderColor: COLORS.gold }]}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>{creatureEmojis}</Text>
            <Text style={[styles.eventAlertText, { color: COLORS.gold }]}>{t('welcomeBack')}</Text>
            <Text style={styles.eventMessage}>
              {t('creaturesFound')} <Text style={{ color: COLORS.gold, fontWeight: 'bold' }}>💰 {offlineReward.coins} {t('coinsWord')}</Text>!
            </Text>
            <Text style={[styles.eventMessage, { fontSize: 13, color: COLORS.textDim, marginBottom: 16 }]}>
              {t('awayBonus')}
            </Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: COLORS.gold, width: '100%' }]}
              onPress={collectOfflineReward}
            >
              <Text style={[styles.btnText, { color: '#1a1a2e' }]}>🎁 {t('collect')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // ─── PLANET EVENT MODAL ──────────────────────────────────────────
  function renderPlanetEvent() {
    if (!planetEvent) return null;
    return (
      <Modal transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.eventCard}>
            <Text style={styles.eventAlertText}>{t('planetAlert')}</Text>
            <Text style={styles.eventMessage}>{planetEvent.message[lang]}</Text>
            <View style={styles.eventBtns}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: COLORS.error, flex: 1, marginRight: 8 }]}
                onPress={() => {
                  setPlanetEvent(null);
                  startMission(planetEvent.mission);
                }}
              >
                <Text style={styles.btnText}>{t('goMission')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: COLORS.cardBg, flex: 1 }]}
                onPress={() => setPlanetEvent(null)}
              >
                <Text style={styles.btnText}>{t('dismiss')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ─── SCREENS ─────────────────────────────────────────────────────

  // Language Select
  if (screen === 'languageSelect') {
    return (
      <View style={styles.container}>
        <StarField />
        <View style={styles.centerContent}>
          <Text style={styles.mainTitle}>🪐 Planet Builders</Text>
          <Text style={styles.subtitle}>{T.en.subtitle}</Text>
          <Text style={[styles.subtitle, { marginTop: 2, marginBottom: 20 }]}>{T.de.subtitle}</Text>
          <Text style={styles.label}>{T.en.chooseLanguage}:</Text>
          <TouchableOpacity style={styles.langBtn} onPress={() => { setLang('en'); setScreen('profileSelect'); }}>
            <Text style={styles.langBtnText}>🇬🇧 English</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.langBtn} onPress={() => { setLang('de'); setScreen('profileSelect'); }}>
            <Text style={styles.langBtnText}>🇩🇪 Deutsch</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Profile Select
  if (screen === 'profileSelect') {
    const langProfiles = profiles.filter(p => p.language === lang);
    return (
      <View style={styles.container}>
        <StarField />
        <View style={styles.centerContent}>
          <Text style={styles.screenTitle}>{t('selectPlayer')}</Text>
          {langProfiles.map((p, i) => {
            const realIdx = profiles.indexOf(p);
            return (
              <TouchableOpacity
                key={i}
                style={styles.profileCard}
                onPress={() => { setCurrentIdx(realIdx); checkOfflineReward(realIdx); setScreen('planet'); }}
              >
                <Text style={styles.profileName}>{p.name}</Text>
                <Text style={styles.profileInfo}>
                  {t('level')} {p.level} · 💰 {p.coins} · {BIOME_EMOJI[BIOME_NAMES[lang].indexOf(p.biome)] || '🏜️'}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.newPlayerBtn} onPress={() => setScreen('createProfile')}>
            <Text style={styles.newPlayerText}>{t('newPlayer')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setScreen('languageSelect')}>
            <Text style={styles.backText}>{t('back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Create Profile
  if (screen === 'createProfile') {
    return (
      <View style={styles.container}>
        <StarField />
        <View style={styles.centerContent}>
          <Text style={styles.screenTitle}>{t('createExplorer')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('enterName')}
            placeholderTextColor={COLORS.textDim}
            value={newName}
            onChangeText={setNewName}
          />
          <Text style={styles.label}>{t('age')}:</Text>
          <View style={styles.ageRow}>
            {(['4-5', '6-7', '8-9', '10-11'] as AgeGroup[]).map(ag => (
              <TouchableOpacity
                key={ag}
                style={[styles.ageBtn, newAge === ag && styles.ageBtnActive]}
                onPress={() => setNewAge(ag)}
              >
                <Text style={[styles.ageBtnText, newAge === ag && styles.ageBtnTextActive]}>{ag}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.btn} onPress={createProfile}>
            <Text style={styles.btnText}>🚀 {t('create')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setScreen('profileSelect')}>
            <Text style={styles.backText}>{t('back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!profile) {
    setScreen('languageSelect');
    return null;
  }

  // Planet (Home)
  if (screen === 'planet') {
    const biomeIdx = BIOME_NAMES[lang].indexOf(profile.biome);
    return (
      <View style={styles.container}>
        <StarField />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.planetTitle}>
            {BIOME_EMOJI[biomeIdx >= 0 ? biomeIdx : 0]} {profile.name}{t('yourPlanet')}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>💰 {profile.coins}</Text>
              <Text style={styles.statLabel}>{t('coins')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>⭐ {profile.level}</Text>
              <Text style={styles.statLabel}>{t('level')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>🏗️ {profile.structures.length}</Text>
              <Text style={styles.statLabel}>{t('structures')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>🐾 {profile.creatures.length}</Text>
              <Text style={styles.statLabel}>{t('creatures')}</Text>
            </View>
          </View>

          {/* XP Bar */}
          <View style={styles.xpBarOuter}>
            <View style={[styles.xpBarInner, { width: `${Math.min(100, (profile.xp / xpForLevel(profile.level)) * 100)}%` }]} />
          </View>
          <Text style={styles.xpText}>XP: {profile.xp} / {xpForLevel(profile.level)}</Text>

          {/* Planet Display */}
          <View style={styles.planetDisplay}>
            <Text style={{ fontSize: 60 }}>{BIOME_EMOJI[biomeIdx >= 0 ? biomeIdx : 0]}</Text>
            <View style={styles.planetItems}>
              {profile.structures.map((s, i) => {
                const sIdx = STRUCTURE_NAMES[lang].indexOf(s);
                return <Text key={`s${i}`} style={{ fontSize: 28, margin: 4 }}>{STRUCTURE_EMOJI[sIdx] || '🏠'}</Text>;
              })}
              {profile.creatures.map((c, i) => {
                const cIdx = CREATURE_NAMES[lang].indexOf(c);
                return <Text key={`c${i}`} style={{ fontSize: 28, margin: 4 }}>{CREATURE_EMOJI[cIdx] || '🐾'}</Text>;
              })}
            </View>
          </View>

          {/* Badges preview */}
          {profile.badges.length > 0 && (
            <View style={styles.badgePreview}>
              {profile.badges.slice(-5).map(bid => (
                <Text key={bid} style={{ fontSize: 22, margin: 2 }}>{BADGE_EMOJI[bid] || '🏅'}</Text>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e040fb' }]} onPress={() => setScreen('shop')}>
              <Text style={styles.actionBtnEmoji}>🛒</Text>
              <Text style={styles.actionBtnText}>{t('shop')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ff6d00' }]} onPress={() => setScreen('missionSelect')}>
              <Text style={styles.actionBtnEmoji}>⚔️</Text>
              <Text style={styles.actionBtnText}>{t('missions')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#00bfa5' }]} onPress={() => setScreen('badges')}>
              <Text style={styles.actionBtnEmoji}>🏅</Text>
              <Text style={styles.actionBtnText}>{t('badgesBtn')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setScreen('profileSelect')} style={{ marginTop: 20 }}>
            <Text style={styles.backText}>{t('back')}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Parent settings gear icon */}
        <TouchableOpacity
          style={{ position: 'absolute', top: 50, right: 16, opacity: 0.4 }}
          onPress={() => { setPinEntry(''); setPinError(false); setScreen('parentPin'); }}
        >
          <Text style={{ fontSize: 22 }}>⚙️</Text>
        </TouchableOpacity>

        {renderPlanetEvent()}
        {renderOfflineReward()}
        {renderBadgePopup()}
      </View>
    );
  }

  // Shop
  if (screen === 'shop') {
    return (
      <View style={styles.container}>
        <StarField />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.screenTitle}>{t('shop')}</Text>
          <Text style={styles.coinDisplay}>💰 {profile.coins} {t('coins')}</Text>

          <Text style={styles.sectionTitle}>{t('biomes')}</Text>
          {BIOME_NAMES[lang].map((name, i) => {
            const owned = profile.biome === name;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.shopItem, owned && styles.shopItemOwned]}
                onPress={() => !owned && buyItem('biome', i)}
              >
                <Text style={styles.shopEmoji}>{BIOME_EMOJI[i]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shopName}>{name}</Text>
                  <Text style={styles.shopCost}>{owned ? t('owned') : `💰 ${BIOME_COST[i]}`}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <Text style={styles.sectionTitle}>{t('structures')}</Text>
          {STRUCTURE_NAMES[lang].map((name, i) => {
            const owned = profile.structures.includes(name);
            return (
              <TouchableOpacity
                key={i}
                style={[styles.shopItem, owned && styles.shopItemOwned]}
                onPress={() => !owned && buyItem('structure', i)}
              >
                <Text style={styles.shopEmoji}>{STRUCTURE_EMOJI[i]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shopName}>{name}</Text>
                  <Text style={styles.shopCost}>{owned ? t('owned') : `💰 ${STRUCTURE_COST[i]}`}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <Text style={styles.sectionTitle}>{t('creatures')}</Text>
          {CREATURE_NAMES[lang].map((name, i) => {
            const owned = profile.creatures.includes(name);
            return (
              <TouchableOpacity
                key={i}
                style={[styles.shopItem, owned && styles.shopItemOwned]}
                onPress={() => !owned && buyItem('creature', i)}
              >
                <Text style={styles.shopEmoji}>{CREATURE_EMOJI[i]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shopName}>{name}</Text>
                  <Text style={styles.shopCost}>{owned ? t('owned') : `💰 ${CREATURE_COST[i]}`}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity onPress={() => setScreen('planet')} style={{ marginTop: 20, marginBottom: 40 }}>
            <Text style={styles.backText}>{t('back')}</Text>
          </TouchableOpacity>
        </ScrollView>
        {renderBadgePopup()}
      </View>
    );
  }

  // Mission Select
  if (screen === 'missionSelect') {
    const allMissions: Array<{ type: 'maths' | 'spelling' | 'science'; emoji: string; color: string }> = [
      { type: 'maths', emoji: '🪐', color: '#448aff' },
      { type: 'spelling', emoji: '🔵', color: '#69f0ae' },
      { type: 'science', emoji: '🟠', color: '#ff6d00' },
    ];
    const missions = allMissions.filter(m =>
      (m.type === 'maths' && settings.mathsEnabled) ||
      (m.type === 'spelling' && settings.spellingEnabled) ||
      (m.type === 'science' && settings.scienceEnabled)
    );
    return (
      <View style={styles.container}>
        <StarField />
        <View style={styles.centerContent}>
          <Text style={styles.screenTitle}>{t('missions')}</Text>
          {missions.map(m => (
            <TouchableOpacity
              key={m.type}
              style={[styles.missionCard, { borderLeftColor: m.color }]}
              onPress={() => startMission(m.type)}
            >
              <Text style={{ fontSize: 36 }}>{m.emoji}</Text>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.missionName}>{ACTIVITY_NAMES[lang][m.type]}</Text>
                <Text style={styles.missionStat}>
                  {t('score')}: {profile.stats[m.type]}
                </Text>
              </View>
              <Text style={styles.startText}>{t('start')}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setScreen('planet')} style={{ marginTop: 20 }}>
            <Text style={styles.backText}>{t('back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Mission Play
  if (screen === 'missionPlay') {
    if (showRoundComplete) return renderRoundComplete();

    return (
      <View style={styles.container}>
        <StarField />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.screenTitle}>{ACTIVITY_NAMES[lang][missionType]}</Text>

          {renderProgressDots()}

          {/* Combo indicator */}
          {profile.combo > 1 && (
            <Text style={styles.comboText}>🔥 x{profile.combo} combo!</Text>
          )}

          {missionType === 'maths' && (
            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{mathQ.question}</Text>
              <TextInput
                style={styles.answerInput}
                keyboardType="number-pad"
                value={userAnswer}
                onChangeText={setUserAnswer}
                placeholder="?"
                placeholderTextColor={COLORS.textDim}
              />
              {!feedback && (
                <TouchableOpacity style={styles.submitBtn} onPress={() => answerQuestion()}>
                  <Text style={styles.btnText}>{t('submit')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {missionType === 'spelling' && (
            <View style={styles.questionCard}>
              <Text style={styles.questionLabel}>{t('spellWord')}</Text>
              <TouchableOpacity
                style={{ backgroundColor: COLORS.accent, width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: COLORS.accentLight, shadowRadius: 20, shadowOpacity: 0.6 }}
                onPress={() => profile && speakWord(spellingWord, lang, AGE_SPEECH[profile.age].spellOnTap, profile.age)}
              >
                <Text style={{ fontSize: 50 }}>🔊</Text>
              </TouchableOpacity>
              <Text style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 4 }}>
                {profile && AGE_SPEECH[profile.age].spellOnTap
                  ? (lang === 'de' ? 'Tippe zum Anhören und Buchstabieren' : 'Tap to hear & spell out')
                  : (lang === 'de' ? 'Tippe zum Anhören' : 'Tap to hear again')}
              </Text>
              {profile && (profile.age === '4-5' || profile.age === '6-7') && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12, gap: 4, flexWrap: 'wrap' }}>
                  {spellingWord.split('').map((_, i) => (
                    <View key={i} style={{ width: 28, height: 32, borderRadius: 6, backgroundColor: userAnswer.length > i ? COLORS.accent : COLORS.cardBg, borderWidth: 1.5, borderColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold' }}>
                        {userAnswer.length > i ? userAnswer[i] : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {profile && profile.age === '8-9' && (
                <Text style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 8 }}>
                  {lang === 'de' ? `${spellingWord.length} Buchstaben` : `${spellingWord.length} letters`}
                </Text>
              )}
              <TextInput
                style={styles.answerInput}
                value={userAnswer}
                onChangeText={setUserAnswer}
                autoCapitalize="none"
                placeholder={lang === 'de' ? 'Hier tippen...' : 'Type here...'}
                placeholderTextColor={COLORS.textDim}
                maxLength={spellingWord.length + 2}
              />
              {!feedback && (
                <TouchableOpacity style={styles.submitBtn} onPress={() => answerQuestion()}>
                  <Text style={styles.btnText}>{t('submit')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {missionType === 'science' && scienceQ && (
            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{scienceQ.q}</Text>
              {!feedback && scienceQ.options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.optionBtn}
                  onPress={() => answerQuestion(i)}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Feedback */}
          {feedback !== '' && (
            <View style={styles.feedbackBox}>
              <Text style={[styles.feedbackText, { color: feedbackColor === COLORS.success ? COLORS.success : COLORS.error }]}>{feedback}</Text>
              {showFact !== '' && (
                <Text style={styles.factText}>{showFact}</Text>
              )}
              {feedbackColor === COLORS.success || tries >= 3 ? (
                <TouchableOpacity style={[styles.btn, { marginTop: 12 }]} onPress={handleNextQuestion}>
                  <Text style={styles.btnText}>{t('next')} →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.btn, { marginTop: 12, backgroundColor: COLORS.error }]} onPress={() => { setFeedback(''); setUserAnswer(''); }}>
                  <Text style={styles.btnText}>{t('tryAgain')} ({3 - tries} left)</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity onPress={() => setScreen('missionSelect')} style={{ marginTop: 20, marginBottom: 40 }}>
            <Text style={styles.backText}>{t('back')}</Text>
          </TouchableOpacity>
        </ScrollView>
        {renderBadgePopup()}
      </View>
    );
  }

  // Badges
  if (screen === 'badges') {
    return (
      <View style={styles.container}>
        <StarField />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.screenTitle}>{t('yourBadges')}</Text>
          {BADGES.map(b => {
            const earned = profile.badges.includes(b.id);
            return (
              <View key={b.id} style={[styles.badgeCard, !earned && styles.badgeCardLocked]}>
                <Text style={{ fontSize: 32, opacity: earned ? 1 : 0.3 }}>{BADGE_EMOJI[b.id] || '🏅'}</Text>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.badgeName, !earned && { opacity: 0.4 }]}>{b.name[lang]}</Text>
                  <Text style={[styles.badgeDesc, !earned && { opacity: 0.3 }]}>{b.desc[lang]}</Text>
                </View>
                {earned && <Text style={{ fontSize: 20 }}>✅</Text>}
              </View>
            );
          })}
          <TouchableOpacity onPress={() => setScreen('planet')} style={{ marginTop: 20, marginBottom: 40 }}>
            <Text style={styles.backText}>{t('back')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Parent PIN Entry
  if (screen === 'parentPin') {
    return (
      <View style={styles.container}>
        <StarField />
        <View style={styles.centerContent}>
          <Text style={styles.screenTitle}>⚙️ {t('parentSettings')}</Text>
          <Text style={styles.label}>{t('enterPin')}</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            value={pinEntry}
            onChangeText={(v) => { setPinEntry(v); setPinError(false); }}
            placeholder="• • • •"
            placeholderTextColor={COLORS.textDim}
          />
          {pinError && <Text style={{ color: COLORS.error, marginTop: 8 }}>{t('wrongPin')}</Text>}
          <TouchableOpacity
            style={[styles.btn, { marginTop: 16 }]}
            onPress={() => {
              if (pinEntry === settings.pin) {
                setScreen('parentSettings');
                setNewPinEntry('');
              } else {
                setPinError(true);
              }
            }}
          >
            <Text style={styles.btnText}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setScreen('planet')} style={{ marginTop: 20 }}>
            <Text style={styles.backText}>{t('back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Parent Settings
  if (screen === 'parentSettings') {
    const timeOptions = [0, 10, 15, 20, 30];
    const roundOptions = [3, 5, 7, 10];
    return (
      <View style={styles.container}>
        <StarField />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.screenTitle}>⚙️ {t('parentSettings')}</Text>

          {/* Session Time Limit */}
          <Text style={styles.sectionTitle}>{t('sessionLimit')}</Text>
          <View style={styles.ageRow}>
            {timeOptions.map(mins => (
              <TouchableOpacity
                key={mins}
                style={[styles.ageBtn, settings.sessionMinutes === mins && styles.ageBtnActive]}
                onPress={() => {
                  setSettings(s => ({ ...s, sessionMinutes: mins }));
                  setSessionStartTime(mins > 0 ? Date.now() : null);
                }}
              >
                <Text style={[styles.ageBtnText, settings.sessionMinutes === mins && styles.ageBtnTextActive]}>
                  {mins === 0 ? t('noLimit') : `${mins} ${t('minutes')}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Enabled Missions */}
          <Text style={styles.sectionTitle}>{t('enabledMissions')}</Text>
          {(['maths', 'spelling', 'science'] as const).map(type => {
            const key = `${type}Enabled` as 'mathsEnabled' | 'spellingEnabled' | 'scienceEnabled';
            const names = { maths: 'Mission to Mars 🪐', spelling: 'Mission to Neptune 🔵', science: 'Mission to Jupiter 🟠' };
            return (
              <TouchableOpacity
                key={type}
                style={[styles.shopItem, settings[key] && styles.shopItemOwned]}
                onPress={() => setSettings(s => ({ ...s, [key]: !s[key] }))}
              >
                <Text style={{ fontSize: 22, marginRight: 12 }}>{settings[key] ? '✅' : '⬜'}</Text>
                <Text style={styles.shopName}>{names[type]}</Text>
              </TouchableOpacity>
            );
          })}

          {/* Questions Per Round */}
          <Text style={styles.sectionTitle}>{t('questionsRound')}</Text>
          <View style={styles.ageRow}>
            {roundOptions.map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.ageBtn, settings.questionsPerRound === n && styles.ageBtnActive]}
                onPress={() => setSettings(s => ({ ...s, questionsPerRound: n }))}
              >
                <Text style={[styles.ageBtnText, settings.questionsPerRound === n && styles.ageBtnTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Change PIN */}
          <Text style={styles.sectionTitle}>{t('changePin')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput
              style={[styles.input, { flex: 1, marginTop: 0 }]}
              keyboardType="number-pad"
              maxLength={4}
              value={newPinEntry}
              onChangeText={setNewPinEntry}
              placeholder={t('newPin')}
              placeholderTextColor={COLORS.textDim}
            />
            <TouchableOpacity
              style={[styles.btn, { marginTop: 0 }]}
              onPress={() => {
                if (newPinEntry.length === 4) {
                  setSettings(s => ({ ...s, pin: newPinEntry }));
                  setNewPinEntry('');
                }
              }}
            >
              <Text style={styles.btnText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>

          {/* Reset Progress */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLORS.error, marginTop: 30, width: '100%', maxWidth: 360 }]}
            onPress={() => {
              setConfirmDialog({
                title: t('resetProgress'),
                message: t('resetConfirm'),
                onConfirm: () => {
                  if (profile) {
                    const reset: Profile = {
                      ...profile,
                      coins: 20, xp: 0, level: 1,
                      biome: lang === 'en' ? 'Crystal Desert' : 'Kristallwüste',
                      structures: [], creatures: [],
                      stats: { maths: 0, spelling: 0, science: 0 },
                      badges: [], combo: 0, bestCombo: 0,
                    };
                    updateProfile(reset);
                  }
                },
              });
            }}
          >
            <Text style={styles.btnText}>{t('resetProgress')}</Text>
          </TouchableOpacity>

          {/* Delete Profile */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: '#8b0000', marginTop: 12, width: '100%', maxWidth: 360 }]}
            onPress={() => {
              setConfirmDialog({
                title: t('deleteProfile'),
                message: t('deleteConfirm'),
                onConfirm: () => {
                  const newProfiles = profiles.filter((_, i) => i !== currentIdx);
                  setProfiles(newProfiles);
                  setCurrentIdx(0);
                  setScreen('profileSelect');
                },
              });
            }}
          >
            <Text style={styles.btnText}>{t('deleteProfile')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setScreen('planet')} style={{ marginTop: 20, marginBottom: 40 }}>
            <Text style={styles.backText}>{t('back')}</Text>
          </TouchableOpacity>
        </ScrollView>
        {renderConfirmDialog()}
      </View>
    );
  }

  // Time Up Modal
  if (showTimeUp) {
    return (
      <View style={styles.container}>
        <StarField />
        <View style={styles.centerContent}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>⏰</Text>
          <Text style={styles.roundTitle}>{t('timeUp')}</Text>
          <Text style={[styles.roundMsg, { marginTop: 12 }]}>{t('timeUpMsg')}</Text>
          <TouchableOpacity
            style={[styles.btn, { marginTop: 24, backgroundColor: COLORS.gold }]}
            onPress={() => {
              setShowTimeUp(false);
              setSessionStartTime(null);
              setScreen('languageSelect');
            }}
          >
            <Text style={[styles.btnText, { color: '#1a1a2e' }]}>{t('ok')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

// ─── STYLES ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.space,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.gold,
    textAlign: 'center',
    textShadowColor: COLORS.accent,
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textDim,
    textAlign: 'center',
    marginTop: 6,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: COLORS.textDim,
    marginTop: 16,
    marginBottom: 8,
  },
  langBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginTop: 12,
    width: 220,
    alignItems: 'center',
  },
  langBtnText: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileCard: {
    backgroundColor: COLORS.cardBg,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  profileInfo: {
    fontSize: 14,
    color: COLORS.textDim,
    marginTop: 4,
  },
  newPlayerBtn: {
    borderWidth: 2,
    borderColor: COLORS.accentLight,
    borderStyle: 'dashed',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  newPlayerText: {
    fontSize: 18,
    color: COLORS.accentLight,
    fontWeight: 'bold',
  },
  backText: {
    color: COLORS.textDim,
    fontSize: 16,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.cardBg,
    color: COLORS.text,
    fontSize: 18,
    padding: 14,
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
    marginTop: 10,
  },
  ageRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  ageBtn: {
    backgroundColor: COLORS.cardBg,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  ageBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accentLight,
  },
  ageBtnText: {
    color: COLORS.textDim,
    fontSize: 16,
    fontWeight: 'bold',
  },
  ageBtnTextActive: {
    color: COLORS.text,
  },
  btn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginTop: 10,
    alignItems: 'center',
  },
  btnText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: 'bold',
  },
  planetTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gold,
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  statBox: {
    backgroundColor: COLORS.cardBg,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 70,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textDim,
    marginTop: 2,
  },
  xpBarOuter: {
    width: '80%',
    maxWidth: 300,
    height: 10,
    backgroundColor: COLORS.cardBg,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 8,
  },
  xpBarInner: {
    height: '100%',
    backgroundColor: COLORS.accentLight,
    borderRadius: 5,
  },
  xpText: {
    fontSize: 12,
    color: COLORS.textDim,
    marginTop: 4,
    marginBottom: 12,
  },
  planetDisplay: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
    maxWidth: 340,
    minHeight: 120,
  },
  planetItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  badgePreview: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    minWidth: 95,
  },
  actionBtnEmoji: {
    fontSize: 28,
  },
  actionBtnText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  coinDisplay: {
    fontSize: 20,
    color: COLORS.gold,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.accentLight,
    marginTop: 16,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    width: '100%',
    maxWidth: 360,
  },
  shopItemOwned: {
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  shopEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  shopName: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  shopCost: {
    fontSize: 13,
    color: COLORS.gold,
    marginTop: 2,
  },
  missionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    width: '100%',
    maxWidth: 360,
    borderLeftWidth: 4,
  },
  missionName: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  missionStat: {
    fontSize: 13,
    color: COLORS.textDim,
    marginTop: 2,
  },
  startText: {
    color: COLORS.accentLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  questionCount: {
    fontSize: 14,
    color: COLORS.textDim,
    marginBottom: 6,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  comboText: {
    fontSize: 18,
    color: COLORS.gold,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  questionCard: {
    backgroundColor: COLORS.cardBg,
    padding: 20,
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  questionLabel: {
    fontSize: 14,
    color: COLORS.textDim,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 28,
    color: COLORS.text,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  answerInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: COLORS.text,
    fontSize: 24,
    padding: 14,
    borderRadius: 12,
    width: '80%',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
  },
  optionBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  optionText: {
    color: COLORS.text,
    fontSize: 18,
    textAlign: 'center',
  },
  feedbackBox: {
    marginTop: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  feedbackText: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  factText: {
    fontSize: 14,
    color: COLORS.accentLight,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  roundTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.gold,
    textAlign: 'center',
  },
  roundMsg: {
    fontSize: 22,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  roundScore: {
    fontSize: 18,
    color: COLORS.accentLight,
    textAlign: 'center',
    marginBottom: 20,
  },
  roundBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  badgePopup: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  badgePopupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 6,
  },
  badgePopupText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  eventCard: {
    backgroundColor: COLORS.panel,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  eventAlertText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  eventMessage: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  eventBtns: {
    flexDirection: 'row',
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  badgeCardLocked: {
    borderColor: 'transparent',
    opacity: 0.6,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  badgeDesc: {
    fontSize: 13,
    color: COLORS.textDim,
    marginTop: 2,
  },
});
