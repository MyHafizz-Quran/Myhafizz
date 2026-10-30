/**
 * MyHafizz · icônes Phosphor (Bold par défaut, Fill pour les états actifs).
 * Couche de compatibilité : garde les noms Lucide utilisés dans le code,
 * mais rend des icônes Phosphor. Props : size, className, weight, fill, color.
 * Passer weight="fill" (ou fill="currentColor") pour la version pleine.
 */
import React from "react";
import {
  ArrowCounterClockwise as PhArrowCounterClockwise,
  ArrowLeft as PhArrowLeft,
  ArrowRight as PhArrowRight,
  ArrowsClockwise as PhArrowsClockwise,
  ArrowsOutLineVertical as PhArrowsOutLineVertical,
  Bell as PhBell,
  BookOpen as PhBookOpen,
  BookmarkSimple as PhBookmarkSimple,
  Brain as PhBrain,
  CalendarBlank as PhCalendarBlank,
  Camera as PhCamera,
  CaretDown as PhCaretDown,
  CaretLeft as PhCaretLeft,
  CaretRight as PhCaretRight,
  CaretUp as PhCaretUp,
  ChartBar as PhChartBar,
  ChatCircle as PhChatCircle,
  Check as PhCheck,
  CheckCircle as PhCheckCircle,
  Checks as PhChecks,
  Circle as PhCircle,
  CircleHalf as PhCircleHalf,
  CircleNotch as PhCircleNotch,
  Clock as PhClock,
  Copy as PhCopy,
  Crown as PhCrown,
  DeviceMobile as PhDeviceMobile,
  DotsSixVertical as PhDotsSixVertical,
  DotsThree as PhDotsThree,
  DownloadSimple as PhDownloadSimple,
  Envelope as PhEnvelope,
  Eye as PhEye,
  EyeSlash as PhEyeSlash,
  FileText as PhFileText,
  Gear as PhGear,
  GearSix as PhGearSix,
  Gift as PhGift,
  HardDrives as PhHardDrives,
  Headphones as PhHeadphones,
  Heart as PhHeart,
  Hourglass as PhHourglass,
  House as PhHouse,
  Keyboard as PhKeyboard,
  Lightbulb as PhLightbulb,
  Lightning as PhLightning,
  LinkSimple as PhLinkSimple,
  List as PhList,
  ListChecks as PhListChecks,
  Lock as PhLock,
  MagnifyingGlass as PhMagnifyingGlass,
  MapPin as PhMapPin,
  Medal as PhMedal,
  Microphone as PhMicrophone,
  MicrophoneSlash as PhMicrophoneSlash,
  MicrophoneStage as PhMicrophoneStage,
  Minus as PhMinus,
  Moon as PhMoon,
  Pause as PhPause,
  PencilLine as PhPencilLine,
  PencilSimple as PhPencilSimple,
  Play as PhPlay,
  Question as PhQuestion,
  Repeat as PhRepeat,
  ShareNetwork as PhShareNetwork,
  Shield as PhShield,
  SidebarSimple as PhSidebarSimple,
  SignOut as PhSignOut,
  Sliders as PhSliders,
  SlidersHorizontal as PhSlidersHorizontal,
  Sparkle as PhSparkle,
  SpeakerHigh as PhSpeakerHigh,
  Square as PhSquare,
  Star as PhStar,
  Sun as PhSun,
  Target as PhTarget,
  TextAlignJustify as PhTextAlignJustify,
  TextT as PhTextT,
  ToggleLeft as PhToggleLeft,
  ToggleRight as PhToggleRight,
  Translate as PhTranslate,
  Trash as PhTrash,
  TrendUp as PhTrendUp,
  Trophy as PhTrophy,
  User as PhUser,
  UserCheck as PhUserCheck,
  UserPlus as PhUserPlus,
  UsersThree as PhUsersThree,
  Warning as PhWarning,
  WifiHigh as PhWifiHigh,
  WifiSlash as PhWifiSlash,
  X as PhX,
  XCircle as PhXCircle
} from "@phosphor-icons/react";

function wrap(PIcon, name) {
  const C = React.forwardRef(function MhIcon({ size = 24, weight, fill, strokeWidth, absoluteStrokeWidth, color, ...rest }, ref) {
    const w = weight || (fill && fill !== "none" ? "fill" : "bold");
    return <PIcon ref={ref} size={size} weight={w} color={color || "currentColor"} {...rest} />;
  });
  C.displayName = name;
  return C;
}

export const AlertTriangle = wrap(PhWarning, "AlertTriangle");
export const AlignJustify = wrap(PhTextAlignJustify, "AlignJustify");
export const AlignVerticalSpaceAround = wrap(PhArrowsOutLineVertical, "AlignVerticalSpaceAround");
export const ArrowLeft = wrap(PhArrowLeft, "ArrowLeft");
export const ArrowRight = wrap(PhArrowRight, "ArrowRight");
export const Award = wrap(PhMedal, "Award");
export const BarChart2 = wrap(PhChartBar, "BarChart2");
export const Bell = wrap(PhBell, "Bell");
export const BookOpen = wrap(PhBookOpen, "BookOpen");
export const Bookmark = wrap(PhBookmarkSimple, "Bookmark");
export const Brain = wrap(PhBrain, "Brain");
export const Calendar = wrap(PhCalendarBlank, "Calendar");
export const Camera = wrap(PhCamera, "Camera");
export const Check = wrap(PhCheck, "Check");
export const CheckCheck = wrap(PhChecks, "CheckCheck");
export const CheckCircle = wrap(PhCheckCircle, "CheckCircle");
export const CheckCircle2 = wrap(PhCheckCircle, "CheckCircle2");
export const ChevronDown = wrap(PhCaretDown, "ChevronDown");
export const ChevronLeft = wrap(PhCaretLeft, "ChevronLeft");
export const ChevronRight = wrap(PhCaretRight, "ChevronRight");
export const ChevronUp = wrap(PhCaretUp, "ChevronUp");
export const Circle = wrap(PhCircle, "Circle");
export const Clock = wrap(PhClock, "Clock");
export const Contrast = wrap(PhCircleHalf, "Contrast");
export const Copy = wrap(PhCopy, "Copy");
export const Crown = wrap(PhCrown, "Crown");
export const Download = wrap(PhDownloadSimple, "Download");
export const Edit3 = wrap(PhPencilSimple, "Edit3");
export const Eye = wrap(PhEye, "Eye");
export const EyeOff = wrap(PhEyeSlash, "EyeOff");
export const FileText = wrap(PhFileText, "FileText");
export const Gift = wrap(PhGift, "Gift");
export const GripVertical = wrap(PhDotsSixVertical, "GripVertical");
export const HardDrive = wrap(PhHardDrives, "HardDrive");
export const Headphones = wrap(PhHeadphones, "Headphones");
export const Heart = wrap(PhHeart, "Heart");
export const HelpCircle = wrap(PhQuestion, "HelpCircle");
export const Hourglass = wrap(PhHourglass, "Hourglass");
export const Keyboard = wrap(PhKeyboard, "Keyboard");
export const Languages = wrap(PhTranslate, "Languages");
export const LayoutDashboard = wrap(PhHouse, "LayoutDashboard");
export const Lightbulb = wrap(PhLightbulb, "Lightbulb");
export const Link2 = wrap(PhLinkSimple, "Link2");
export const ListChecks = wrap(PhListChecks, "ListChecks");
export const Loader2 = wrap(PhCircleNotch, "Loader2");
export const Lock = wrap(PhLock, "Lock");
export const LogOut = wrap(PhSignOut, "LogOut");
export const Mail = wrap(PhEnvelope, "Mail");
export const MapPin = wrap(PhMapPin, "MapPin");
export const Medal = wrap(PhMedal, "Medal");
export const Menu = wrap(PhList, "Menu");
export const MessageCircle = wrap(PhChatCircle, "MessageCircle");
export const Mic = wrap(PhMicrophone, "Mic");
export const Mic2 = wrap(PhMicrophoneStage, "Mic2");
export const MicOff = wrap(PhMicrophoneSlash, "MicOff");
export const Minus = wrap(PhMinus, "Minus");
export const Moon = wrap(PhMoon, "Moon");
export const MoreHorizontal = wrap(PhDotsThree, "MoreHorizontal");
export const PanelLeft = wrap(PhSidebarSimple, "PanelLeft");
export const Pause = wrap(PhPause, "Pause");
export const PenLine = wrap(PhPencilLine, "PenLine");
export const Play = wrap(PhPlay, "Play");
export const RefreshCw = wrap(PhArrowsClockwise, "RefreshCw");
export const Repeat = wrap(PhRepeat, "Repeat");
export const RotateCcw = wrap(PhArrowCounterClockwise, "RotateCcw");
export const Search = wrap(PhMagnifyingGlass, "Search");
export const Settings = wrap(PhGear, "Settings");
export const Settings2 = wrap(PhGearSix, "Settings2");
export const Share2 = wrap(PhShareNetwork, "Share2");
export const Shield = wrap(PhShield, "Shield");
export const Sliders = wrap(PhSliders, "Sliders");
export const SlidersHorizontal = wrap(PhSlidersHorizontal, "SlidersHorizontal");
export const Smartphone = wrap(PhDeviceMobile, "Smartphone");
export const Sparkles = wrap(PhSparkle, "Sparkles");
export const Square = wrap(PhSquare, "Square");
export const Star = wrap(PhStar, "Star");
export const Sun = wrap(PhSun, "Sun");
export const Target = wrap(PhTarget, "Target");
export const ToggleLeft = wrap(PhToggleLeft, "ToggleLeft");
export const ToggleRight = wrap(PhToggleRight, "ToggleRight");
export const Trash2 = wrap(PhTrash, "Trash2");
export const TrendingUp = wrap(PhTrendUp, "TrendingUp");
export const Trophy = wrap(PhTrophy, "Trophy");
export const Type = wrap(PhTextT, "Type");
export const User = wrap(PhUser, "User");
export const UserCheck = wrap(PhUserCheck, "UserCheck");
export const UserPlus = wrap(PhUserPlus, "UserPlus");
export const Users = wrap(PhUsersThree, "Users");
export const Volume2 = wrap(PhSpeakerHigh, "Volume2");
export const Wifi = wrap(PhWifiHigh, "Wifi");
export const WifiOff = wrap(PhWifiSlash, "WifiOff");
export const X = wrap(PhX, "X");
export const XCircle = wrap(PhXCircle, "XCircle");
export const Zap = wrap(PhLightning, "Zap");

// Icônes supplémentaires MyHafizz
export const Home = wrap(PhHouse, "Home");
