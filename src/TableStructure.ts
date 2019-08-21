// Table structure logic.

import * as GridLayout from "virtual-grid-layout/GridLayout";
import {LayoutController, ViewportPosition, MeasureFunction} from "virtual-grid-layout/GridLayout";
import * as GridScroll from "virtual-grid-layout/GridScroll";
import {ScrollUnit} from "virtual-grid-layout/GridScroll";
import * as GridResize from "virtual-grid-layout/GridResize";
import {ResizeController} from "virtual-grid-layout/GridResize";
import * as GridUtils from "virtual-grid-layout/GridUtils";
import * as PlainScrollbar from "plain-scrollbar";
import {PlainScrollbar as Scrollbar} from "plain-scrollbar";

export {topLeftViewportPosition} from "virtual-grid-layout/GridLayout";
export {MeasureFunction};

export const enum CellType {regular, macro, colHeader, rowHeader, tlcHeader}

// Function to creates and/or prepare a cell content element.
//
// @param cellType
//    The type of the cell.
// @param rowNdx
//    The row index of the cell.
//    This parameter is 0 if `cellType` is `colHeader`.
// @param colNdx
//    The column index of the cell.
//    This parameter is 0 if `cellType` is `macro` or `rowHeader`.
// @param width
//    The width of the cell content area in pixels. Can be ignored.
// @param height
//    The height of the cell content area in pixels. Can be ignored.
// @param oldCellContent
//    An old cell content element with the same `rowNdx`/`colNdx`, that can be reused.
// @returns
//    A prepared cell content element that can be inserted into a grid cell.
//    If an `oldElement` is passed and the returned element is not the same, the `oldElement` is released.
export type PrepareCellContentFunction = (cellType: CellType, rowNdx: number, colNdx: number, width: number, height: number, oldCellContent: HTMLElement | undefined) => HTMLElement;

export type ReleaseCellContentFunction = (cellContent: HTMLElement) => void;

// Static table configuration parameters.
// These parameters do not change after the table has been created.
export interface StaticConfig {
   tableElement:                       HTMLElement;                  // table root element
   colHeaderHeight:                    number;                       // column header height in pixels, 0 = no column header
   rowHeaderWidth:                     number;                       // row header width in pixels, 0 = no row header
   vScrollbarVisible:                  boolean;                      // false = no vertical scrollbar
   hScrollbarVisible:                  boolean;                      // false = no horizontal scrollbar
   macroCellsAvailable:                boolean;                      // true = macro cells are available and vertical cell overlap is used
   rowSizingEnableHeader:              boolean;                      // true to enable row sizing in the row header
   colSizingEnableHeader:              boolean;                      // true to enable column sizing in the column header
   rowSizingEnableContent:             boolean;                      // true to enable row sizing in the main content grid
   colSizingEnableContent:             boolean;                      // true to enable column sizing in the main content grid
   rowSizingMaxColsHeader?:            number;                       // maximum active columns for row sizing in row header
   cssVars?:                           Map<string,string>;           // default values for CSS variables
   measure?:                           MeasureFunction;              // function to measure undetermined row heights or column widths
   prepareCellContent:                 PrepareCellContentFunction;   // function to create and/or prepare cell content elements
   releaseCellContent?:                ReleaseCellContentFunction; } // function to release cell content elements that are no longer in use

// Dynamic table configuration parameters.
// These parameters change while the table is in use.
export interface DynamicConfig {
   viewportPosition:                   ViewportPosition;
   rowHeights:                         Int16Array;                   // row heights, may contain -1 for undetermined heights
   colWidths:                          Int16Array;                   // column widths, may contain -1 for undetermined widths
   macroCellHeights?:                  Int16Array;                   // optional macro cell heights, 0 = no macro cell
   macroCellWidth:                     number;                       // width of macro cells
   rowHeaderColWidths?:                Int16Array; }                 // optional row header column widths, if multiple column widths are to be used

interface CssConfig {
   backgroundColor:                    string;                       // background color of main content area
   innerBorderColor:                   string;                       // color of inner table border
   innerBorderWidth:                   number;                       // width of inner table border in pixels
   vGridLineColor:                     string;                       // vertical grid line color
   hGridLineColor:                     string;                       // horizontal grid line color
   vGridLineWidth:                     number;                       // vertical grid line width
   hGridLineWidth:                     number;                       // horizontal grid line width
   colHeaderVGridLineColor:            string;                       // vertical grid line color of column headers
   colHeaderHGridLineColor:            string;                       // horizontal grid line color of column headers (bottom column header border)
   colHeaderVGridLineWidth:            number;                       // vertical grid line width of column headers
   colHeaderHGridLineWidth:            number;                       // horizontal grid line width of column headers (bottom column header border)
   rowHeaderVGridLineColor:            string;                       // vertical grid line color of row headers (right row header border)
   rowHeaderHGridLineColor:            string;                       // horizontal grid line color of row headers
   rowHeaderVGridLineWidth:            number;                       // vertical grid line width of row headers (right row header border)
   rowHeaderHGridLineWidth:            number;                       // horizontal grid line width of row headers
   tlcHeaderVGridLineColor:            string;                       // vertical grid line color of top left corner header (right border)
   tlcHeaderHGridLineColor:            string;                       // horizontal grid line color of top left corner header (bottom border)
   tlcHeaderVGridLineWidth:            number;                       // vertical grid line width of top left corner header (right border)
   tlcHeaderHGridLineWidth:            number;                       // horizontal grid line width of top left corner header (bottom border)
   vScrollbarWidth:                    number;                       // vertical scrollbar width
   hScrollbarWidth:                    number;                       // horizontal scrollbar width
   rowSizingTopWidth:                  number;                       // horizontal resize handle width above row boundary
   rowSizingBottomWidth:               number;                       // horizontal resize handle width below row boundary
   colSizingLeftWidth:                 number;                       // vertical resize handle width left of column boundary
   colSizingRightWidth:                number; }                     // vertical resize handle width right of column boundary

export class StructureController extends EventTarget {

   private staticConfig:               StaticConfig;
   private dynamicConfig:              DynamicConfig;
   private cssConfig:                  CssConfig;

   private isDisposed:                 boolean;
   private renderRequested:            boolean = false;
   private animationFrameRequestId:    number = 0;                   // 0 = no pending animation frame
   private tableContainerElement:      HTMLElement;
   private tableCss:                   CSSStyleDeclaration;

   // Content grid:
   private cGridElement:               HTMLElement;
   private cGridLayoutController:      LayoutController;
   private cGridResizeController:      ResizeController;
   private cGridVCellOverlap:          number;

   // Headers:
   private colHdrGridElement:          HTMLElement;                  // column header grid element
   private colHdrGridLayoutController: LayoutController;
   private colHdrGridResizeController: ResizeController;
   private rowHdrGridElement:          HTMLElement;                  // row header grid element
   private rowHdrGridLayoutController: LayoutController;
   private rowHdrGridResizeController: ResizeController;
   private tlcHdrGridElement:          HTMLElement;                  // top left corner header grid element
   private tlcHdrGridLayoutController: LayoutController;

   // Scrollbars:
   private vScrollbar:                 Scrollbar;
   private hScrollbar:                 Scrollbar;

   constructor (staticConfig: StaticConfig, dynamicConfig: DynamicConfig) {
      super();
      this.staticConfig = staticConfig;
      this.dynamicConfig = dynamicConfig;
      this.getCssConfig();
      this.createComponents();
      this.addTableEventListeners(); }

   public dispose() {
      const sc = this.staticConfig;
      if (this.isDisposed) {
         return; }
      this.removeTableEventListeners();
      this.isDisposed = true;
      if (this.animationFrameRequestId) {
         cancelAnimationFrame(this.animationFrameRequestId);
         this.animationFrameRequestId = 0; }
      //
      if (this.cGridLayoutController) {
         this.cGridLayoutController.clear(this.releaseCell); }
      if (this.colHdrGridLayoutController) {
         this.colHdrGridLayoutController.clear(this.releaseCell); }
      if (this.rowHdrGridLayoutController) {
         this.rowHdrGridLayoutController.clear(this.releaseCell); }
      if (this.tlcHdrGridLayoutController) {
         this.tlcHdrGridLayoutController.clear(this.releaseCell); }
      //
      if (this.cGridResizeController) {
         this.cGridResizeController.dispose(); }
      if (this.colHdrGridResizeController) {
         this.colHdrGridResizeController.dispose(); }
      if (this.rowHdrGridResizeController) {
         this.rowHdrGridResizeController.dispose(); }
      //
      if (this.tableContainerElement) {
         sc.tableElement.removeChild(this.tableContainerElement); }}

   //--- Create components -----------------------------------------------------

   private createComponents() {
      const sc = this.staticConfig;
      this.createTableContainerElement();
      if (sc.colHeaderHeight > 0 && sc.rowHeaderWidth > 0) {
         this.createTopLeftCornerHeaderGrid(); }
      if (sc.colHeaderHeight > 0) {
         this.createColHeaderGrid(); }
      if (sc.rowHeaderWidth > 0) {
         this.createRowHeaderGrid(); }
      this.createContentGrid();
      if (sc.vScrollbarVisible) {
         this.createVScrollbar(); }
      if (sc.hScrollbarVisible) {
         this.createHScrollbar(); }}

   private createTableContainerElement() {
      const sc = this.staticConfig;
      const cc = this.cssConfig;
      this.tableContainerElement = document.createElement("div");
      const style = this.tableContainerElement.style;
      style.boxSizing = "border-box";
      style.position = "relative";
      style.height = "100%";
      style.overflow = "hidden";
      if (cc.innerBorderWidth > 0) {
         style.borderWidth = cc.innerBorderWidth + "px";
         style.borderColor = cc.innerBorderColor;
         style.borderStyle = "solid"; }
      sc.tableElement.appendChild(this.tableContainerElement); }

   private createContentGrid() {
      const sc = this.staticConfig;
      const cc = this.cssConfig;
      this.cGridElement = document.createElement("div");
      const style = this.cGridElement.style;
      style.position = "absolute";
      style.top      = sc.colHeaderHeight + "px";
      style.left     = sc.rowHeaderWidth + "px";
      style.right    = (sc.vScrollbarVisible ? cc.vScrollbarWidth : 0) + "px";
      style.bottom   = (sc.hScrollbarVisible ? cc.hScrollbarWidth : 0) + "px";
      style.backgroundColor = cc.backgroundColor;
      this.tableContainerElement.appendChild(this.cGridElement);
      this.cGridLayoutController = new LayoutController(this.cGridElement);
      if (sc.rowSizingEnableContent || sc.colSizingEnableContent) {
         const resizeControllerParms: GridResize.ControllerParms = {
            layoutController:     this.cGridLayoutController,
            rowSizingEnabled:     sc.rowSizingEnableContent,
            colSizingEnabled:     sc.colSizingEnableContent,
            rowSizingTopWidth:    cc.rowSizingTopWidth,
            rowSizingBottomWidth: cc.rowSizingBottomWidth,
            colSizingLeftWidth:   cc.colSizingLeftWidth,
            colSizingRightWidth:  cc.colSizingRightWidth };
         this.cGridResizeController = new ResizeController(resizeControllerParms);
         this.cGridResizeController.addEventListener("element-resize", <EventListener>this.resizeController_elementResize); }
      this.cGridVCellOverlap = sc.macroCellsAvailable ? cc.hGridLineWidth : 0; }

   private createColHeaderGrid() {
      const sc = this.staticConfig;
      const cc = this.cssConfig;
      this.colHdrGridElement = document.createElement("div");
      const style = this.colHdrGridElement.style;
      style.position = "absolute";
      style.top      = "0";
      style.left     = sc.rowHeaderWidth + "px";
      style.right    = (sc.vScrollbarVisible ? cc.vScrollbarWidth : 0) + "px";
      style.height   = sc.colHeaderHeight + "px";
      style.backgroundColor = cc.backgroundColor;
      this.tableContainerElement.appendChild(this.colHdrGridElement);
      this.colHdrGridLayoutController = new LayoutController(this.colHdrGridElement);
      if (sc.colSizingEnableHeader) {
         const resizeControllerParms: GridResize.ControllerParms = {
            layoutController:     this.colHdrGridLayoutController,
            rowSizingEnabled:     false,
            colSizingEnabled:     true,
            rowSizingTopWidth:    cc.rowSizingTopWidth,
            rowSizingBottomWidth: cc.rowSizingBottomWidth,
            colSizingLeftWidth:   cc.colSizingLeftWidth,
            colSizingRightWidth:  cc.colSizingRightWidth };
         this.colHdrGridResizeController = new ResizeController(resizeControllerParms);
         this.colHdrGridResizeController.addEventListener("element-resize", <EventListener>this.resizeController_elementResize); }}

   private createRowHeaderGrid() {
      const sc = this.staticConfig;
      const cc = this.cssConfig;
      this.rowHdrGridElement = document.createElement("div");
      const style = this.rowHdrGridElement.style;
      style.position = "absolute";
      style.top      = sc.colHeaderHeight + "px";
      style.left     = "0";
      style.bottom   = (sc.hScrollbarVisible ? cc.hScrollbarWidth : 0) + "px";
      style.width    = sc.rowHeaderWidth + "px";
      style.backgroundColor = cc.backgroundColor;
      this.tableContainerElement.appendChild(this.rowHdrGridElement);
      this.rowHdrGridLayoutController = new LayoutController(this.rowHdrGridElement);
      if (sc.rowSizingEnableHeader) {
         const resizeControllerParms: GridResize.ControllerParms = {
            layoutController:     this.rowHdrGridLayoutController,
            rowSizingEnabled:     true,
            colSizingEnabled:     false,
            rowSizingTopWidth:    cc.rowSizingTopWidth,
            rowSizingBottomWidth: cc.rowSizingBottomWidth,
            colSizingLeftWidth:   cc.colSizingLeftWidth,
            colSizingRightWidth:  cc.colSizingRightWidth,
            rowSizingMaxCols:     sc.rowSizingMaxColsHeader };
         this.rowHdrGridResizeController = new ResizeController(resizeControllerParms);
         this.rowHdrGridResizeController.addEventListener("element-resize", <EventListener>this.resizeController_elementResize); }}

   private createTopLeftCornerHeaderGrid() {
      const sc = this.staticConfig;
      this.tlcHdrGridElement = document.createElement("div");
      const style = this.tlcHdrGridElement.style;
      style.position = "absolute";
      style.top      = "0";
      style.left     = "0";
      style.height   = sc.colHeaderHeight + "px";
      style.width    = sc.rowHeaderWidth + "px";
      this.tableContainerElement.appendChild(this.tlcHdrGridElement);
      this.tlcHdrGridLayoutController = new LayoutController(this.tlcHdrGridElement); }

   private createVScrollbar() {
      const sc = this.staticConfig;
      const cc = this.cssConfig;
      PlainScrollbar.registerCustomElement();
      this.vScrollbar = <Scrollbar>document.createElement("plain-scrollbar");
      this.vScrollbar.orientation = "vertical";
      const style = this.vScrollbar.style;
      style.boxSizing = "border-box";
      style.position = "absolute";
      style.top      = "0";
      style.right    = "0";
      style.bottom   = (sc.hScrollbarVisible ? cc.hScrollbarWidth : 0) + "px";
      style.width    = cc.vScrollbarWidth + "px";
      this.tableContainerElement.appendChild(this.vScrollbar);
      this.vScrollbar.addEventListener("scrollbar-input", <any>this.scrollbar_input); }

   private createHScrollbar() {
      const sc = this.staticConfig;
      const cc = this.cssConfig;
      PlainScrollbar.registerCustomElement();
      this.hScrollbar = <Scrollbar>document.createElement("plain-scrollbar");
      this.hScrollbar.orientation = "horizontal";
      const style = this.hScrollbar.style;
      style.boxSizing = "border-box";
      style.position = "absolute";
      style.left     = "0";
      style.right    = (sc.vScrollbarVisible ? cc.vScrollbarWidth : 0) + "px";
      style.bottom   = "0";
      style.height   = cc.hScrollbarWidth + "px";
      this.tableContainerElement.appendChild(this.hScrollbar);
      this.hScrollbar.addEventListener("scrollbar-input", <any>this.scrollbar_input); }

   //--- Events ----------------------------------------------------------------

   private addTableEventListeners() {
      const sc = this.staticConfig;
      sc.tableElement.addEventListener("wheel", this.table_wheel);
      sc.tableElement.addEventListener("keydown", this.table_keydown); }

   private removeTableEventListeners() {
      const sc = this.staticConfig;
      sc.tableElement.removeEventListener("wheel", this.table_wheel);
      sc.tableElement.removeEventListener("keydown", this.table_keydown); }

   private scrollbar_input = (event: CustomEvent) => {
      if (this.isDisposed) {
         return; }
      const r = GridUtils.convertPlainScrollbarInputEvent(event);
      if (!r) {
         return; }
      const scrollbar = <Scrollbar>event.target;
      this.scroll(scrollbar.orientationBoolean, r.scrollUnit, r.scrollValue);
      this.requestRender(); }

   private table_wheel = (event: WheelEvent) => {
      if (this.isDisposed) {
         return; }
      this.scroll(true, ScrollUnit.mediumIncr, Math.sign(event.deltaY));
      this.requestRender();
      event.stopPropagation();
      event.preventDefault(); }

   private table_keydown = (event: KeyboardEvent) => {
      if (this.isDisposed) {
         return; }
      const r = GridUtils.convertKeyboardEvent(event);
      if (!r) {
         return; }
      this.scroll(r.orientation, r.scrollUnit, r.scrollValue);
      this.requestRender();
      event.stopPropagation();
      event.preventDefault(); }

   private scroll (orientation: boolean, scrollUnit: ScrollUnit, scrollValue: number) {
      const sc = this.staticConfig;
      const dc = this.dynamicConfig;
      const ip = {
         scrollUnit,
         scrollValue,
         topNdx:       orientation ? dc.viewportPosition.rowNdx : dc.viewportPosition.colNdx,
         elementCount: orientation ? dc.rowHeights.length : dc.colWidths.length,
         viewportSize: orientation ? this.cGridElement.clientHeight : this.cGridElement.clientWidth,
         elementSizes: orientation ? dc.rowHeights : dc.colWidths,
         measure:      sc.measure ? (startNdx: number, n: number) => sc.measure!(startNdx, n, orientation) : undefined};
      const r = GridScroll.process(ip);
      if (orientation) {
         dc.viewportPosition.rowNdx = r.topNdx; }
       else {
         dc.viewportPosition.colNdx = r.topNdx; }
      const scrollbar = orientation ? this.vScrollbar : this.hScrollbar;
      if (scrollbar) {
         scrollbar.value = r.scrollbarPosition;
         scrollbar.thumbSize = r.scrollbarThumbSize; }}

   private resizeController_elementResize = (event: CustomEvent) => {
      const dc = this.dynamicConfig;
      if (this.isDisposed) {
         return; }
      const d = event.detail;
      const cancelled = !this.dispatchEvent(new CustomEvent("element-resize", {detail: d, cancelable: true}));
      if (cancelled) {
         return; }
      const sizes = d.orientation ? dc.rowHeights : dc.colWidths;
      if (d.ndx < 0 || d.ndx >= sizes.length) {
         return; }
      sizes[d.ndx] = d.size;
      this.requestRender(); }

   //--- Render ----------------------------------------------------------------

   public requestRender() {
      if (this.isDisposed) {
         return; }
      this.renderRequested = true;
      this.scheduleAnimationFrame(); }

   private scheduleAnimationFrame() {
      if (this.animationFrameRequestId) {
         return; }
      this.animationFrameRequestId = requestAnimationFrame(this.animationFrameHandler); }

   private animationFrameHandler = () => {
      this.animationFrameRequestId = 0;
      if (this.isDisposed) {
         return; }
      if (this.renderRequested) {
         this.render(); }}

   private render() {
      this.renderRequested = false;
      this.scroll(true,  ScrollUnit.none, 0);
      this.scroll(false, ScrollUnit.none, 0);
      if (this.tlcHdrGridElement) {
         this.renderTopLeftCornerHeaderGrid(); }
      if (this.colHdrGridElement) {
         this.renderColHeaderGrid(); }
      if (this.rowHdrGridElement) {
         this.renderRowHeaderGrid(); }
      this.renderContentGrid(); }

   private renderContentGrid() {
      const sc = this.staticConfig;
      const dc = this.dynamicConfig;
      const renderParms : GridLayout.RenderParms = {
         viewportPosition:  dc.viewportPosition,
         rowHeights:        dc.rowHeights,
         colWidths:         dc.colWidths,
         macroCellHeights:  sc.macroCellsAvailable ? dc.macroCellHeights : undefined,
         macroCellWidth:    sc.macroCellsAvailable ? dc.macroCellWidth : 0,
         vCellOverlap:      this.cGridVCellOverlap,
         measure:           sc.measure,
         prepareCell:       (cellType: GridLayout.CellType, rowNdx: number, colNdx: number, width: number, height: number, oldCell: HTMLElement | undefined) =>
                               this.prepareCell(mapCellType(cellType), rowNdx, colNdx, width, height, oldCell),
         releaseCell:       this.releaseCell };
      this.cGridLayoutController.render(renderParms); }

   private renderColHeaderGrid() {
      const sc = this.staticConfig;
      const dc = this.dynamicConfig;
      const renderParms : GridLayout.RenderParms = {
         viewportPosition:  {rowNdx: 0, colNdx: dc.viewportPosition.colNdx, rowPixelOffset: 0, colPixelOffset: dc.viewportPosition.colPixelOffset},
         rowHeights:        Int16Array.of(sc.colHeaderHeight),
         colWidths:         dc.colWidths,
         macroCellWidth:    0,
         vCellOverlap:      0,
         measure:           sc.measure,
         prepareCell:       (_cellType: GridLayout.CellType, rowNdx: number, colNdx: number, width: number, height: number, oldCell: HTMLElement | undefined) =>
                               this.prepareCell(CellType.colHeader, rowNdx, colNdx, width, height, oldCell),
         releaseCell:       this.releaseCell };
      this.colHdrGridLayoutController.render(renderParms); }

   private renderRowHeaderGrid() {
      const sc = this.staticConfig;
      const dc = this.dynamicConfig;
      const renderParms : GridLayout.RenderParms = {
         viewportPosition:  {rowNdx: dc.viewportPosition.rowNdx, colNdx: 0, rowPixelOffset: dc.viewportPosition.rowPixelOffset, colPixelOffset: 0},
         rowHeights:        dc.rowHeights,
         colWidths:         dc.rowHeaderColWidths ? dc.rowHeaderColWidths : Int16Array.of(sc.rowHeaderWidth),
         macroCellWidth:    0,
         vCellOverlap:      0,
         measure:           sc.measure,
         prepareCell:       (_cellType: GridLayout.CellType, rowNdx: number, colNdx: number, width: number, height: number, oldCell: HTMLElement | undefined) =>
                               this.prepareCell(CellType.rowHeader, rowNdx, colNdx, width, height, oldCell),
         releaseCell:       this.releaseCell };
      this.rowHdrGridLayoutController.render(renderParms); }

   private renderTopLeftCornerHeaderGrid() {
      const sc = this.staticConfig;
      const dc = this.dynamicConfig;
      const renderParms : GridLayout.RenderParms = {
         viewportPosition:  {rowNdx: 0, colNdx: 0, rowPixelOffset: 0, colPixelOffset: 0},
         rowHeights:        Int16Array.of(sc.colHeaderHeight),
         colWidths:         dc.rowHeaderColWidths ? dc.rowHeaderColWidths : Int16Array.of(sc.rowHeaderWidth),
         macroCellWidth:    0,
         vCellOverlap:      0,
         prepareCell:       (_cellType: GridLayout.CellType, rowNdx: number, colNdx: number, width: number, height: number, oldCell: HTMLElement | undefined) =>
                               this.prepareCell(CellType.tlcHeader, rowNdx, colNdx, width, height, oldCell),
         releaseCell:       this.releaseCell };
      this.tlcHdrGridLayoutController.render(renderParms); }

   private prepareCell (cellType: CellType, rowNdx: number, colNdx: number, width: number, height: number, oldCell: HTMLElement | undefined) : HTMLElement {
      const sc = this.staticConfig;
      const cc = this.cssConfig;
      const oldCellContent = getCellContent(oldCell);
      const vCellOverlap = (cellType == CellType.regular || cellType == CellType.macro) ? this.cGridVCellOverlap : 0;
      const contentWidth = Math.max(0, width - cc.hGridLineWidth);
      const contentHeight = Math.max(0, height - cc.vGridLineWidth - vCellOverlap);
      const newCellContent = sc.prepareCellContent(cellType, rowNdx, colNdx, contentWidth, contentHeight, oldCellContent);
      if (oldCellContent && newCellContent == oldCellContent) {
         return oldCell!; }
      let newCell: HTMLElement;
      if (oldCell) {
         if (oldCellContent) {
            oldCell.removeChild(oldCellContent);
            if (sc.releaseCellContent) {
               sc.releaseCellContent(oldCellContent); }}
         newCell = oldCell; }
       else {
         newCell = this.createCellElement(cellType, vCellOverlap); }
      newCell.appendChild(newCellContent);
      return newCell; }

   private createCellElement (cellType: CellType, vCellOverlap: number) : HTMLElement {
      const cc = this.cssConfig;
      const cell = document.createElement("div");
      const style = cell.style;
      style.boxSizing = "border-box";
      style.backgroundColor = "#ffffff";
      let vGridLineColor: string;
      let hGridLineColor: string;
      let vGridLineWidth: number;
      let hGridLineWidth: number;
      switch (cellType) {
         case CellType.regular: case CellType.macro: {
            vGridLineColor = cc.vGridLineColor;
            hGridLineColor = cc.hGridLineColor;
            vGridLineWidth = cc.vGridLineWidth;
            hGridLineWidth = cc.hGridLineWidth;
            break; }
         case CellType.colHeader: {
            vGridLineColor = cc.colHeaderVGridLineColor;
            hGridLineColor = cc.colHeaderHGridLineColor;
            vGridLineWidth = cc.colHeaderVGridLineWidth;
            hGridLineWidth = cc.colHeaderHGridLineWidth;
            break; }
         case CellType.rowHeader: {
            vGridLineColor = cc.rowHeaderVGridLineColor;
            hGridLineColor = cc.rowHeaderHGridLineColor;
            vGridLineWidth = cc.rowHeaderVGridLineWidth;
            hGridLineWidth = cc.rowHeaderHGridLineWidth;
            break; }
         case CellType.tlcHeader: {
            vGridLineColor = cc.tlcHeaderVGridLineColor;
            hGridLineColor = cc.tlcHeaderHGridLineColor;
            vGridLineWidth = cc.tlcHeaderVGridLineWidth;
            hGridLineWidth = cc.tlcHeaderHGridLineWidth;
            break; }
         default: {
            throw new Error("Unknown cell type."); }}
      if (hGridLineWidth > 0) {
         if (vCellOverlap > 0) {
            style.borderTopStyle = "solid";
            style.borderTopColor = hGridLineColor;
            style.borderTopWidth = hGridLineWidth + "px"; }
         style.borderBottomStyle = "solid";
         style.borderBottomColor = hGridLineColor;
         style.borderBottomWidth = hGridLineWidth + "px"; }
      if (vGridLineWidth > 0) {
         style.borderRightStyle = "solid";
         style.borderRightColor = vGridLineColor;
         style.borderRightWidth = vGridLineWidth + "px"; }
      return cell; }

   private releaseCell = (cell: HTMLElement) => {
      const sc = this.staticConfig;
      const cellContent = getCellContent(cell);
      if (cellContent && sc.releaseCellContent) {
         sc.releaseCellContent(cellContent); }}

   //--- CSS config ------------------------------------------------------------

   private getCssConfig() {
      const sc = this.staticConfig;
      this.tableCss = getComputedStyle(sc.tableElement);
      const cc = <CssConfig>{};
      cc.backgroundColor         = this.getCssVarStr("backgroundColor",         "#fdfdfd");
      cc.innerBorderColor        = this.getCssVarStr("innerBorderColor",        "#404040");
      cc.innerBorderWidth        = this.getCssVarLen("innerBorderWidth",        0);
      const gridLineColor        = this.getCssVarStr("GridLineColor",           "#AAAAAA");
      cc.vGridLineColor          = this.getCssVarStr("vGridLineColor",          gridLineColor);
      cc.hGridLineColor          = this.getCssVarStr("hGridLineColor",          gridLineColor);
      const gridLineWidth        = this.getCssVarLen("gridLineWidth",           1);
      cc.vGridLineWidth          = this.getCssVarLen("vGridLineWidth",          gridLineWidth);
      cc.hGridLineWidth          = this.getCssVarLen("hGridLineWidth",          gridLineWidth);
      const headerGridLineColor  = this.getCssVarStr("headerGridLineColor",     "#888888");
      const headerGridLineWidth  = this.getCssVarLen("headerGridLineWidth",     gridLineWidth);
      cc.colHeaderVGridLineColor = this.getCssVarStr("colHeaderVGridLineColor", headerGridLineColor);
      cc.colHeaderHGridLineColor = this.getCssVarStr("colHeaderHGridLineColor", headerGridLineColor);
      cc.colHeaderVGridLineWidth = this.getCssVarLen("colHeaderVGridLineWidth", headerGridLineWidth);
      cc.colHeaderHGridLineWidth = this.getCssVarLen("colHeaderHGridLineWidth", headerGridLineWidth);
      cc.rowHeaderVGridLineColor = this.getCssVarStr("rowHeaderVGridLineColor", headerGridLineColor);
      cc.rowHeaderHGridLineColor = this.getCssVarStr("rowHeaderHGridLineColor", headerGridLineColor);
      cc.rowHeaderVGridLineWidth = this.getCssVarLen("rowHeaderVGridLineWidth", headerGridLineWidth);
      cc.rowHeaderHGridLineWidth = this.getCssVarLen("rowHeaderHGridLineWidth", headerGridLineWidth);
      cc.tlcHeaderVGridLineColor = this.getCssVarStr("tlcHeaderVGridLineColor", headerGridLineColor);
      cc.tlcHeaderHGridLineColor = this.getCssVarStr("tlcHeaderHGridLineColor", headerGridLineColor);
      cc.tlcHeaderVGridLineWidth = this.getCssVarLen("tlcHeaderVGridLineWidth", headerGridLineWidth);
      cc.tlcHeaderHGridLineWidth = this.getCssVarLen("tlcHeaderHGridLineWidth", headerGridLineWidth);
      const scrollbarWidth       = this.getCssVarLen("scrollbarWidth",          15);
      cc.vScrollbarWidth         = this.getCssVarLen("vScrollbarWidth",         scrollbarWidth);
      cc.hScrollbarWidth         = this.getCssVarLen("hScrollbarWidth",         scrollbarWidth);
      cc.rowSizingTopWidth       = this.getCssVarLen("rowSizingTopWidth",       6);
      cc.rowSizingBottomWidth    = this.getCssVarLen("rowSizingBottomWidth",    5);
      cc.colSizingLeftWidth      = this.getCssVarLen("colSizingLeftWidth",      6);
      cc.colSizingRightWidth     = this.getCssVarLen("colSizingRightWidth",     5);
      this.cssConfig = cc; }

   // Returns a CSS variable or `undefined`.
   private getCssVar (varName: string) : string | undefined {
      const sc = this.staticConfig;
      const v = this.tableCss.getPropertyValue("--plain-table-" + varName).trim();
      if (v) {
         return v; }
      if (sc.cssVars) {
         return sc.cssVars.get(varName); }
      return undefined; }

   // Returns a CSS variable as a string.
   private getCssVarStr (varName: string, defaultValue: string) : string {
      return this.getCssVar(varName) || defaultValue; }

   // Returns a numeric CSS variable that represents a length in pixels.
   // The variable value may contain the suffix "px".
   private getCssVarLen (varName: string, defaultValue: number) : number {
      let s = this.getCssVar(varName);
      if (s && s.endsWith("px")) {
         s = s.substring(0, s.length - 2); }
      if (s) {
         const n = Number(s);
         if (isFinite(n)) {
            return n; }
         console.log(`Invalid numeric value for CSS variable "${varName}"`); }
      return defaultValue; }

   }

//------------------------------------------------------------------------------

function mapCellType (cellType: GridLayout.CellType) : CellType {
   switch (cellType) {
      case GridLayout.CellType.regular: return CellType.regular;
      case GridLayout.CellType.macro:   return CellType.macro;
      // @ts-ignore: Unreachable code detected
      otherwise: throw new Error("Unexpected cell type."); }}

function getCellContent (cell: HTMLElement | undefined) : HTMLElement | undefined {
   if (!cell) {
      return; }
   const content = cell.firstChild;
   if (!content) {
      return; }
   if (!(content instanceof HTMLElement)) {
      throw new Error("Cell child element is not HTMLElement."); }
   return content; }
