"use client";

import { useEffect, useRef, memo } from "react";

interface TradingViewWidgetProps {
  symbol: string;
  width?: string | number;
  height?: number;
}

/**
 * TradingView Mini Chart Widget
 * Embeds a TradingView chart for the given symbol
 */
function TradingViewWidgetComponent({
  symbol,
  width = "100%",
  height = 200,
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing widget
    containerRef.current.innerHTML = "";

    // Create the widget container
    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    containerRef.current.appendChild(widgetContainer);

    // Create and inject the script
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: symbol,
      width: width,
      height: height,
      locale: "en",
      dateRange: "12M",
      colorTheme: "dark",
      isTransparent: true,
      autosize: false,
      largeChartUrl: "",
      chartOnly: false,
      noTimeScale: false,
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol, width, height]);

  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{ height }}
    >
      <div className="tradingview-widget-container__widget" />
    </div>
  );
}

export const TradingViewWidget = memo(TradingViewWidgetComponent);
