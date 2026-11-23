import { SceneCells } from "./components/SceneCells";
import {
  Scene,
  RecordPlayer,
  LanguageControls,
  MusicInfo,
  Introduction,
  About,
  Skills,
  Projects,
  Contact,
  ProjectDialog,
  AudioTrack,
  Announcer,
} from "./components/Portfolio";

export function App() {
  return (
    <>
      <SceneCells />
      <Scene />
      <RecordPlayer />
      <LanguageControls />
      <MusicInfo />
      <Introduction />
      <About />
      <Skills />
      <Projects />
      <Contact />
      <ProjectDialog />
      <AudioTrack />
      <Announcer />
    </>
  );
}
