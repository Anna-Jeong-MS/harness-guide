import React from "react";
import { renderDashboardSummary } from "../src/modules/dashboard-summary";
import { searchInstruments } from "../src/modules/instrument-search";
import { assembleSearchResultCards } from "../src/modules/search-result-assembler";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const queryValue = Array.isArray(q) ? q[0] : q;
  const query = queryValue?.trim() || "US AI infrastructure BUY candidates";
  const searchResult = searchInstruments(query);
  const html = renderDashboardSummary({
    query,
    searchResult,
    searchCards: assembleSearchResultCards(searchResult),
  });

  return <main dangerouslySetInnerHTML={{ __html: html }} />;
}
