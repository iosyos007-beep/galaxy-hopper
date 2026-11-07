// All game data lives here so new stages and ships are a data change, not a code change.

// Stage `dest` picks the destination planet model (see models.js PLANET_STYLES).
// `needStars` = total stars required to open the stage on the star map.
export const STAGES = [
  { id: 1, name: 'Moon',          dest: 'moon',      length: 9000,  needStars: 0,  rockColors: ['#8C7B6B', '#6E6880', '#A0826A', '#5E6B78'] },
  { id: 2, name: 'Mars',          dest: 'mars',      length: 10000, needStars: 2,  rockColors: ['#9A5A3C', '#7A4A36', '#B0704C', '#6A4436'] },
  { id: 3, name: 'Asteroid Belt', dest: 'belt',      length: 11000, needStars: 4,  rockColors: ['#7C746A', '#5E5A66', '#8E7E6C', '#4E5560'] },
  { id: 4, name: 'Jupiter',       dest: 'jupiter',   length: 12000, needStars: 7,  rockColors: ['#8E7660', '#A08468', '#6E5E50', '#7A6A5E'] },
  { id: 5, name: 'Saturn',        dest: 'saturn',    length: 12500, needStars: 10, rockColors: ['#A89A80', '#8A8070', '#C0AE90', '#6E6658'] },
  { id: 6, name: 'Uranus',        dest: 'uranus',    length: 13000, needStars: 13, rockColors: ['#7A9AA0', '#5E7A88', '#90B0B4', '#4E6670'] },
  { id: 7, name: 'Neptune',       dest: 'neptune',   length: 13500, needStars: 16, rockColors: ['#5E6E9A', '#4A5A88', '#7080B0', '#3E4A70'] },
  { id: 8, name: 'Black Hole',    dest: 'blackhole', length: 14000, needStars: 19, rockColors: ['#5A4A6A', '#4A3A58', '#6E5A80', '#3A2E48'] }
];

// stats are 1..5. Game.js turns them into physics numbers.
export const SHIPS = [
  { id: 'cub',    name: 'Comet Cub',   tag: 'Starter rocket',  price: 0,    color: '#FF4D6D', stats: { speed: 2, thrust: 2, fuel: 2, shield: 3 } },
  { id: 'saucer', name: 'Star Saucer', tag: 'Super nimble',    price: 500,  color: '#8B6CFF', stats: { speed: 2, thrust: 5, fuel: 3, shield: 3 } },
  { id: 'racer',  name: 'Nova Racer',  tag: 'Fastest ship',    price: 1200, color: '#FFC93C', stats: { speed: 5, thrust: 3, fuel: 2, shield: 3 } },
  { id: 'hauler', name: 'Moon Hauler', tag: 'Big tank, tough', price: 2500, color: '#3DDC84', stats: { speed: 2, thrust: 2, fuel: 5, shield: 5 } }
];

export const DIFFICULTY = {
  easy:   { gap: [300, 175], fuelEvery: 1300, fuelGain: 40, drain: 2.2, thrustDrain: 3.8, speed: [210, 285], bigRock: 0.05 },
  normal: { gap: [250, 140], fuelEvery: 1500, fuelGain: 36, drain: 3.0, thrustDrain: 5.0, speed: [230, 320], bigRock: 0.10 },
  hard:   { gap: [205, 112], fuelEvery: 1800, fuelGain: 32, drain: 3.8, thrustDrain: 6.5, speed: [250, 360], bigRock: 0.16 }
};

// Stars for a finished stage, from the share of coins collected.
export function starsFor(coins, total) {
  const pct = total ? coins / total : 0;
  return 1 + (pct >= 0.4 ? 1 : 0) + (pct >= 0.75 ? 1 : 0);
}
