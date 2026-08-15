/* Component design: "精密工作台" onboarding — dark instrument panel with warm paper proof cards. */
import { Check, Layers3, MoveUpRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const ONBOARDING_KEY = "logocraft-onboarding-v1";

const steps = [
  { icon: Layers3, eyebrow: "01 / 多画板", title: "一个工程，多个交付面。", copy: "用画板管理器新建、命名和切换不同规格的标志稿。批量导出时，每个画板都将保留自己的尺寸、出血和图层状态。", proof: "ARTBOARDS / 03" },
  { icon: MoveUpRight, eyebrow: "02 / 精确编辑", title: "让构图跟随你的度量。", copy: "框选图层后可整体缩放、旋转、对齐和分布。拖拽时会吸附到画布、对象和你的自定义参考线。", proof: "SNAP / 15°" },
  { icon: Sparkles, eyebrow: "03 / 版本审阅", title: "每一版，都有可回溯的证据。", copy: "打开历史记录，收藏关键快照，并用像素叠加差异图框选、注释具体改动。所有进度会自动保存到当前浏览器。", proof: "HISTORY / READY" },
];

export default function OnboardingGuide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const current = steps[step];
  const Icon = current.icon;

  const close = (complete = true) => {
    if (complete) window.localStorage.setItem(ONBOARDING_KEY, "complete");
    setOpen(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if ((!window.localStorage.getItem(ONBOARDING_KEY) && !params.has("embed")) || params.has("tour")) setOpen(true);
    const reopen = () => { setStep(0); setOpen(true); };
    window.addEventListener("logocraft-onboarding-open", reopen);
    return () => window.removeEventListener("logocraft-onboarding-open", reopen);
  }, []);

  if (!open) return null;

  return <div className="onboarding-scrim" role="dialog" aria-modal="true" aria-label="LogoCraft 新手引导"><section className="onboarding-panel"><header className="flex items-center justify-between border-b border-white/10 px-6 py-4"><div className="flex items-center gap-2"><span className="onboarding-mark">LC</span><span className="section-label">欢迎使用 LogoCraft</span></div><button title="跳过引导" className="text-[10px] font-bold tracking-[.08em] text-[#969499] transition hover:text-[#fff8f0]" onClick={() => close()}>跳过</button></header><div className="grid md:grid-cols-[.9fr_1.1fr]"><div className="onboarding-proof"><div className="onboarding-grid" /><span className="onboarding-proof-label">{current.proof}</span><div className="onboarding-symbol"><Icon size={44} strokeWidth={1.4} /></div><div className="onboarding-orbit" /></div><div className="p-6 md:p-8"><p className="section-label text-[#ff9a77]">{current.eyebrow}</p><h2 className="mt-3 font-display text-2xl font-bold tracking-[-.055em] text-[#fff8f0]">{current.title}</h2><p className="mt-4 max-w-sm text-[13px] leading-6 text-[#b8b6b5]">{current.copy}</p><div className="mt-8 flex items-center justify-between"><div className="flex gap-1.5" aria-label={`第 ${step + 1} 步，共 ${steps.length} 步`}>{steps.map((item, index) => <span key={item.eyebrow} className={`h-1.5 w-7 ${index === step ? "bg-[#ff6b35]" : "bg-white/15"}`} />)}</div><button className="action-button action-primary px-4" onClick={() => step < steps.length - 1 ? setStep((value) => value + 1) : close()}>{step < steps.length - 1 ? "下一步" : <><Check size={14} /> 开始编辑</>}</button></div></div></div><footer className="border-t border-white/10 px-6 py-3 text-[9px] leading-relaxed text-[#858388]">提示：按 <kbd className="key-cap">?</kbd> 随时打开快捷键说明；工程会自动保存在当前浏览器。</footer></section></div>;
}
