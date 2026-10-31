const RECITER_NAMES = {
  "ar.alafasy": "Mishary Al-Afasy",
  "ar.hudhaify": "Ali Al-Hudhaify",
  "ar.minshawi": "Mohamed Al-Minshawi",
  "ar.abdurrahmanalsudais": "Abdurrahman As-Sudais",
  "ar.husary": "Mahmoud Al-Husary",
  "ar.mahermuaiqly": "Maher Al-Muaiqly",
  "ar.ahmedajamy": "Ahmed Al-Ajamy",
  "ar.muhammadayyoub": "Muhammad Ayyoub",
  "ar.muhammadjibreel": "Muhammad Jibreel",
  "ar.parhizgar": "Parhizgar",
  "ar.ibrahimakhbar": "Ibrahim Akhbar",
  "ar.shaatree": "Abu Bakr Ash-Shaatree",
};

export function getReciterDisplayName(reciterCode) {
  return RECITER_NAMES[reciterCode] || reciterCode;
}
