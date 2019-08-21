// Demo application for the plain-table module.

import * as TableStructure from "plain-table/TableStructure";
import {CellType} from "plain-table/TableStructure";
import * as Utils from "./Utils";

const enum StyleVariant {plain = 1, buttonHeaders = 2, subTables = 3}
const subTableOpenColumnWidth = 16;

interface AppParms {
   rowCount:                 number;
   rowHeightLo:              number;
   rowHeightHi:              number;
   colCount:                 number;
   colWidthLo:               number;
   colWidthHi:               number;
   macroCellRate:            number;
   macroCellHeightLo:        number;
   macroCellHeightHi:        number;
   macroCellWidth:           number;
   colHeaderHeight:          number;
   rowHeaderWidth:           number;
   vScrollbarVisible:        boolean;
   hScrollbarVisible:        boolean;
   styleVariant:             StyleVariant;
   rowSizingEnableHeader:    boolean;
   colSizingEnableHeader:    boolean;
   rowSizingEnableContent:   boolean;
   colSizingEnableContent:   boolean; }

var appParms:                AppParms;
var structureController:     TableStructure.StructureController;
var dConfig:                 TableStructure.DynamicConfig;
var hiddenMacroCellHeights:  Int16Array;

function getAppParms() {
   const ap = <AppParms>{};
   ap.rowCount               = Utils.getInputElementValueNum("rowCount");
   ap.rowHeightLo            = Utils.getInputElementValueNum("rowHeightLo");
   ap.rowHeightHi            = Utils.getInputElementValueNum("rowHeightHi");
   ap.colCount               = Utils.getInputElementValueNum("colCount");
   ap.colWidthLo             = Utils.getInputElementValueNum("colWidthLo");
   ap.colWidthHi             = Utils.getInputElementValueNum("colWidthHi");
   ap.macroCellRate          = Utils.getInputElementValueNum("macroCellRate");
   ap.macroCellHeightLo      = Utils.getInputElementValueNum("macroCellHeightLo");
   ap.macroCellHeightHi      = Utils.getInputElementValueNum("macroCellHeightHi");
   ap.macroCellWidth         = Utils.getInputElementValueNum("macroCellWidth");
   ap.colHeaderHeight        = Utils.getInputElementValueNum("colHeaderHeight");
   ap.rowHeaderWidth         = Utils.getInputElementValueNum("rowHeaderWidth");
   ap.vScrollbarVisible      = Utils.getChecked("vScrollbarVisible");
   ap.hScrollbarVisible      = Utils.getChecked("hScrollbarVisible");
   ap.styleVariant           = Number((<HTMLSelectElement>document.getElementById("styleVariant"))!.value);
   ap.rowSizingEnableHeader  = Utils.getChecked("rowSizingEnableHeader");
   ap.colSizingEnableHeader  = Utils.getChecked("colSizingEnableHeader");
   ap.rowSizingEnableContent = Utils.getChecked("rowSizingEnableContent");
   ap.colSizingEnableContent = Utils.getChecked("colSizingEnableContent");
   appParms = ap; }

function randomSize (lo: number, hi: number) : number {
   return Math.round(lo + Math.max(0, (hi - lo)) * Math.random()); }

function setDynamicConfig() {
   dConfig.viewportPosition = {...TableStructure.topLeftViewportPosition};
   dConfig.rowHeights = new Int16Array(appParms.rowCount);
   dConfig.macroCellHeights = new Int16Array(appParms.rowCount);
   hiddenMacroCellHeights = new Int16Array(appParms.rowCount);
   const macroCellsHidden = (appParms.styleVariant == StyleVariant.subTables);
   for (let rowNdx = 0; rowNdx < appParms.rowCount; rowNdx++) {
      const macroCellHeight = Math.random() < appParms.macroCellRate || macroCellsHidden ? randomSize(appParms.macroCellHeightLo, appParms.macroCellHeightHi) : 0;
      dConfig.macroCellHeights[rowNdx] = macroCellsHidden ? 0 : macroCellHeight;
      hiddenMacroCellHeights[rowNdx] = macroCellHeight;
      dConfig.rowHeights[rowNdx] = dConfig.macroCellHeights[rowNdx] + randomSize(appParms.rowHeightLo, appParms.rowHeightHi); }
   dConfig.colWidths = new Int16Array(appParms.colCount);
   for (let colNdx = 0; colNdx < appParms.colCount; colNdx++) {
      dConfig.colWidths[colNdx] = randomSize(appParms.colWidthLo, appParms.colWidthHi); }
   dConfig.macroCellWidth = appParms.macroCellWidth;
   dConfig.rowHeaderColWidths = (appParms.styleVariant == StyleVariant.subTables) ? Int16Array.of(appParms.rowHeaderWidth, subTableOpenColumnWidth) : undefined; }

function createTable() {
   if (structureController) {
      structureController.dispose(); }
   const tableElement = document.getElementById("table")!;
   let cssVars: Map<string,string> | undefined;
   switch (appParms.styleVariant) {
      case StyleVariant.buttonHeaders:
      case StyleVariant.subTables: {
         cssVars = new Map();
         cssVars.set("rowHeaderVGridLineWidth", "0");
         cssVars.set("rowHeaderHGridLineWidth", "0");
         cssVars.set("colHeaderVGridLineWidth", "0");
         cssVars.set("colHeaderHGridLineWidth", "0");
         cssVars.set("tlcHeaderVGridLineWidth", "0");
         cssVars.set("tlcHeaderHGridLineWidth", "0");
         cssVars.set("innerBorderColor", "#404040");
         cssVars.set("innerBorderWidth", "1"); }}
   const sConfig: TableStructure.StaticConfig = {
      tableElement,
      colHeaderHeight:        appParms.colHeaderHeight,
      rowHeaderWidth:         appParms.rowHeaderWidth + (appParms.styleVariant == StyleVariant.subTables ? subTableOpenColumnWidth : 0),
      vScrollbarVisible:      appParms.vScrollbarVisible,
      hScrollbarVisible:      appParms.hScrollbarVisible,
      macroCellsAvailable:    appParms.macroCellWidth > 0 && appParms.macroCellHeightHi > 0,
      rowSizingEnableHeader:  appParms.rowSizingEnableHeader,
      colSizingEnableHeader:  appParms.colSizingEnableHeader,
      rowSizingEnableContent: appParms.rowSizingEnableContent,
      colSizingEnableContent: appParms.colSizingEnableContent,
      rowSizingMaxColsHeader: (appParms.styleVariant == StyleVariant.subTables) ? 1 : undefined,
      cssVars,
      prepareCellContent};
   dConfig = <TableStructure.DynamicConfig>{};
   setDynamicConfig();
   structureController = new TableStructure.StructureController(sConfig, dConfig); }

function processAppParms() {
   getAppParms();
   createTable();
   structureController.requestRender(); }

function appParms_change() {
   try {
      processAppParms(); }
    catch (e) {
      alert(e); }}

function isMacroCellOpen (rowNdx: number) : boolean {
   return dConfig.macroCellHeights![rowNdx] > 0; }

function openMacroCell (rowNdx: number) {
   if (isMacroCellOpen(rowNdx)) {
      return; }
   dConfig.macroCellHeights![rowNdx] = hiddenMacroCellHeights[rowNdx];
   dConfig.rowHeights[rowNdx] += hiddenMacroCellHeights[rowNdx];
   structureController.requestRender(); }

function closeMacroCell (rowNdx: number) {
   if (!isMacroCellOpen(rowNdx)) {
      return; }
   dConfig.macroCellHeights![rowNdx] = 0;
   dConfig.rowHeights[rowNdx] = Math.max(25, dConfig.rowHeights[rowNdx] - hiddenMacroCellHeights[rowNdx]);
   structureController.requestRender(); }

function recycleCellContent (cellType: CellType, rowNdx: number, colNdx: number, cellContent: HTMLElement) : boolean {
   switch (cellType) {
      case CellType.rowHeader: {
         switch (colNdx) {
            case 1: {
               return Boolean(cellContent.dataset.open) == isMacroCellOpen(rowNdx); }}}}
   return true; }

function createCellContent (cellType: CellType, rowNdx: number, colNdx: number) : HTMLElement {
   const cellContent = document.createElement("div");
   const normalCellContentClassName = "cellContent";
   const headerCellContentClassName = (appParms.styleVariant == StyleVariant.plain) ? normalCellContentClassName : "cellContentButton";
   switch (cellType) {
      case CellType.regular: {
         cellContent.textContent = rowNdx + " / " + colNdx;
         cellContent.className = normalCellContentClassName;
         break; }
      case CellType.macro: {
         cellContent.textContent = "Macro cell " + rowNdx;
         cellContent.className = normalCellContentClassName;
         break; }
      case CellType.colHeader: {
         cellContent.textContent = "Col " + colNdx;
         cellContent.className = headerCellContentClassName;
         break; }
      case CellType.rowHeader: {
         switch (colNdx) {
            case 0: {
               cellContent.textContent = String(rowNdx);
               cellContent.className = headerCellContentClassName;
               break; }
            case 1: {
               if (isMacroCellOpen(rowNdx)) {
                  cellContent.className = "cellContentCloseButton";
                  cellContent.addEventListener("click", () => closeMacroCell(rowNdx));
                  cellContent.dataset.open = "1"; }
                else {
                  cellContent.className = "cellContentOpenButton";
                  cellContent.addEventListener("click", () => openMacroCell(rowNdx)); }
               break; }}
         break; }
      case CellType.tlcHeader: {
         cellContent.textContent = "";
         cellContent.className = headerCellContentClassName;
         break; }
      default: {
         cellContent.textContent = "(unknown cell type)";
         break; }}
   return cellContent; }

function prepareCellContent (cellType: CellType, rowNdx: number, colNdx: number, _width: number, _height: number, oldCellContent: HTMLElement | undefined) : HTMLElement {
   if (oldCellContent && recycleCellContent(cellType, rowNdx, colNdx, oldCellContent)) {
      return oldCellContent; }
   return createCellContent(cellType, rowNdx, colNdx); }

function init() {
   document.getElementById("appParms")!.addEventListener("change", appParms_change);
   processAppParms();
   // tableElement.focus();
   }

async function startup() {
   try {
      init(); }
    catch (e) {
      console.log(e);
      alert(e); }}

document.addEventListener("DOMContentLoaded", startup);
