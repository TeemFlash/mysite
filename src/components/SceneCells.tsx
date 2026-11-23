import { useEffect, useState } from "react";
import { CellCount } from "./ui/cell-count";

export function SceneCells() {
  const [ru, setRu] = useState(document.documentElement.lang === "ru");
  const [scene, setScene] = useState(document.body.dataset.state === "scene");

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setRu(document.documentElement.lang === "ru");
      setScene(document.body.dataset.state === "scene");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-state"],
    });
    return () => observer.disconnect();
  }, []);

  return <CellCount active={scene} ru={ru} />;
}
