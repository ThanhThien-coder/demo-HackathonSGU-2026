"use client";

import React, { useState } from "react";
import { FileCode, Copy, Check, Maximize2 } from "lucide-react";
import { RAW_SNIPPET_CODE } from "./mockData";

interface CodeSnippetViewerProps {
  fileName?: string;
  scope?: string;
  onOpenFullFile: () => void;
}

export function CodeSnippetViewer({
  fileName = "order.service.ts",
  scope = "Scope: OrderService.processCheckout",
  onOpenFullFile,
}: CodeSnippetViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(RAW_SNIPPET_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div
      className="bg-white border border-[#e5e7eb]/80 flex flex-col overflow-hidden rounded-[16px] shadow-[0px_8px_24px_0px_rgba(148,75,0,0.08)] w-full lg:w-[588px] shrink-0"
      data-node-id="5:64"
      data-name="Section"
    >
      {/* File Header */}
      <div
        className="bg-gradient-to-r from-white to-[#faf8ff] border-b-[0.8px] border-[#eaedff] px-4 py-3.5 flex items-center justify-between"
        data-node-id="5:65"
      >
        <div className="flex items-center gap-2.5">
          <div className="bg-[#eaedff] size-7 rounded-[8px] flex items-center justify-center shrink-0">
            <FileCode className="size-4 text-[#004cff]" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[#004cff] text-[15px] leading-tight font-mono">
              {fileName}
            </span>
            <span className="font-semibold text-[#554337] text-[12px] leading-tight">
              {scope}
            </span>
          </div>
        </div>
      </div>

      {/* Code Area */}
      <div
        className="flex-1 min-h-[380px] bg-[#faf8ff] overflow-x-auto font-mono text-[13px] leading-[19.5px] select-text"
        data-node-id="5:79"
      >
        <div className="min-w-full flex flex-col">
          {/* Line 18 */}
          <div className="border-b-[0.8px] border-[#e5e7eb] h-8 flex items-center px-4 hover:bg-[#f2f3ff]/50 transition-colors">
            <span className="w-8 shrink-0 text-[#99a1af] text-xs select-none">18</span>
            <span className="text-[#006780]">async</span>
            <span className="text-[#944b00] ml-1.5">processCheckout</span>
            <span className="text-[#131b2e]">(dto: </span>
            <span className="text-[#625e56]">CheckoutDto</span>
            <span className="text-[#131b2e]">): </span>
            <span className="text-[#006780]">Promise</span>
            <span className="text-[#131b2e]">&lt;</span>
            <span className="text-[#625e56]">OrderResult</span>
            <span className="text-[#131b2e]">&gt; &#123;</span>
          </div>

          {/* Line 19 */}
          <div className="border-b-[0.8px] border-[#e5e7eb] h-8 flex items-center pl-10 pr-4 hover:bg-[#f2f3ff]/50 transition-colors">
            <span className="w-6 shrink-0 text-[#99a1af] text-xs select-none -ml-6">19</span>
            <span className="text-[#006780]">const</span>
            <span className="text-[#131b2e]">&nbsp;order = </span>
            <span className="text-[#006780]">&nbsp;await</span>
            <span className="text-[#625e56]">&nbsp;this</span>
            <span className="text-[#131b2e]">.orderRepo.create(dto);</span>
          </div>

          {/* Line 20 - empty */}
          <div className="border-b-[0.8px] border-[#e5e7eb] h-8 flex items-center px-4">
            <span className="w-8 shrink-0 text-[#99a1af] text-xs select-none">20</span>
          </div>

          {/* Line 21 */}
          <div className="border-b-[0.8px] border-[#e5e7eb] h-8 flex items-center px-4 hover:bg-[#f2f3ff]/50 transition-colors">
            <span className="w-8 shrink-0 text-[#99a1af] text-xs select-none">21</span>
            <span className="text-[#131b2e]">for</span>
            <span className="text-[#131b2e]">&nbsp;(</span>
            <span className="text-[#131b2e]">const</span>
            <span className="text-[#131b2e]">&nbsp;item&nbsp;</span>
            <span className="text-[#131b2e]">of</span>
            <span className="text-[#131b2e]">&nbsp;dto.items) &#123;</span>
          </div>

          {/* Line 22 - Highlighted target line */}
          <div className="border-b-[0.8px] border-[#ff9640]/40 bg-[#fff0e4]/60 h-8 flex items-center pl-10 pr-4 transition-colors relative">
            <span className="w-6 shrink-0 font-bold text-[#ff9640] text-xs select-none -ml-6">
              22
            </span>
            <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#ff9640]" />
            <span className="text-[#006780]">await</span>
            <span className="text-[#625e56]">&nbsp;this</span>
            <span className="text-[#131b2e]">
              .inventoryRepo.updateStock(item.id, item.qty);
            </span>
          </div>

          {/* Line 23 */}
          <div className="border-b-[0.8px] border-[#e5e7eb] h-8 flex items-center px-4 hover:bg-[#f2f3ff]/50 transition-colors">
            <span className="w-8 shrink-0 text-[#99a1af] text-xs select-none">23</span>
            <span className="text-[#131b2e]">&#125;</span>
          </div>

          {/* Line 24 - empty */}
          <div className="border-b-[0.8px] border-[#e5e7eb] h-8 flex items-center px-4">
            <span className="w-8 shrink-0 text-[#99a1af] text-xs select-none">24</span>
          </div>

          {/* Line 25 */}
          <div className="border-b-[0.8px] border-[#e5e7eb] h-8 flex items-center pl-10 pr-4 hover:bg-[#f2f3ff]/50 transition-colors">
            <span className="w-6 shrink-0 text-[#99a1af] text-xs select-none -ml-6">25</span>
            <span className="text-[#006780]">const</span>
            <span className="text-[#131b2e]">&nbsp;payment = </span>
            <span className="text-[#006780]">&nbsp;await</span>
            <span className="text-[#625e56]">&nbsp;this</span>
            <span className="text-[#131b2e]">.paymentGateway.charge(order.id, dto.amount);</span>
          </div>

          {/* Line 26 */}
          <div className="border-b-[0.8px] border-[#e5e7eb] h-8 flex items-center pl-10 pr-4 hover:bg-[#f2f3ff]/50 transition-colors">
            <span className="w-6 shrink-0 text-[#99a1af] text-xs select-none -ml-6">26</span>
            <span className="text-[#006780]">await</span>
            <span className="text-[#625e56]">&nbsp;this</span>
            <span className="text-[#131b2e]">.auditLog.record(</span>
            <span className="text-[#944b00]">&apos;ORDER_CREATED&apos;</span>
            <span className="text-[#131b2e]">, order.id);</span>
          </div>

          {/* Line 27 */}
          <div className="border-b-[0.8px] border-[#e5e7eb] h-8 flex items-center pl-10 pr-4 hover:bg-[#f2f3ff]/50 transition-colors">
            <span className="w-6 shrink-0 text-[#99a1af] text-xs select-none -ml-6">27</span>
            <span className="text-[#006780]">return</span>
            <span className="text-[#131b2e]">&nbsp;&#123; orderId: order.id, status: </span>
            <span className="text-[#944b00]">&apos;SUCCESS&apos;</span>
            <span className="text-[#131b2e]">&nbsp;&#125;;</span>
          </div>

          {/* Line 28 */}
          <div className="border-b-[0.8px] border-[#e5e7eb] h-8 flex items-center px-4 hover:bg-[#f2f3ff]/50 transition-colors">
            <span className="w-8 shrink-0 text-[#99a1af] text-xs select-none">28</span>
            <span className="text-[#131b2e]">&#125;</span>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div
        className="bg-[#944b00] border-t-[0.8px] border-[#eaedff] px-4 py-2.5 flex items-center justify-end gap-2.5 shrink-0"
        data-node-id="5:154"
      >
        {/* Copy Button */}
        <button
          onClick={handleCopy}
          type="button"
          className="bg-white hover:bg-white/95 active:bg-white/90 text-[#131b2e] text-xs font-bold px-3 py-1.5 rounded-[6px] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
          data-node-id="5:156"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-[#00bc7d]" />
              <span className="text-[#00bc7d]">Đã chép</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5 text-[#554337]" />
              <span>Sao chép code</span>
            </>
          )}
        </button>

        {/* View Full File Button */}
        <button
          onClick={onOpenFullFile}
          type="button"
          className="bg-white hover:bg-white/95 active:bg-white/90 text-[#131b2e] text-xs font-bold px-3 py-1.5 rounded-[6px] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
          data-node-id="5:162"
        >
          <Maximize2 className="size-3.5 text-[#554337]" />
          <span>Xem toàn bộ file</span>
        </button>
      </div>
    </div>
  );
}
