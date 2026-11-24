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
