
import Evented from '../Util/Evented'
import Color from '../Util/Color'
import FeatureGroup from "./FeatureGroup";
import { defined, createGuid, Cartesian3, LabelStyle, Scene, lonlatTuple, defaultValue, LabelCollection, Cartesian2, HeightReference, VerticalOrigin, HorizontalOrigin, DistanceDisplayCondition, NearFarScalar } from '../Engine';
import { isPosition, cartesianToLonlat } from '../Util/Util';



interface LabelOptions {
  id?: string,
  show?: boolean,
  text?: string,
  font?: string,
  fillColor?: Color,
  outlineColor?: Color,
  outlineWidth?: number,
  showBackground?: boolean,
  backgroundColor?: Color,
  backgroundPadding?: Cartesian2,
  style?: LabelStyle,
  pixelOffset?: Cartesian2,
  eyeOffset?: Cartesian3,
  horizontalOrigin?: HorizontalOrigin,
  verticalOrigin?: VerticalOrigin,
  scale?: number,
  translucencyByDistance?: any,
  pixelOffsetScaleByDistance?: any,
  disableDepthTestDistance?: number,
  heightReference?: HeightReference,
  scaleByDistance?: NearFarScalar,
  distanceDisplayCondition?: DistanceDisplayCondition
}


    /**
     * 文字标牌
     * @alias Label
     * @constructor
     * @name Label
     * @param {lonlatTuple|Cartesian3} position 形如[lon, lat, alt]的数组或三维笛卡尔坐标
     * @param {Object} options 
     * @param {String} options.text 文字内容
     * @param {String} options.font 字体及大小，如'24px 微软雅黑'
     * @param {Color} options.fillColor 文字填充色.
     * @param {Color} options.outlineColor 文字轮廓颜色.
     * @param {Number} options.outlineWidth 文字轮廓宽.
     * @param {Boolean} options.showBackground 是否显示背景.
     * @param {Color} options.backgroundColor 背景色.
     * @param {Cartesian2} options.backgroundPadding 背景内边距.
     * @param {LabelStyle} options.style 文字样式.
     * @param {Cartesian2} options.pixelOffset 像素偏移.
     * @param {Number} options.scale 文字的缩放倍数.
     * @param {HorizontalOrigin} options.horizontalOrigin 水平方向锚点.
     * @param {VerticalOrigin} options.verticalOrigin 垂直方向锚点.
     * @param {HeightReference} options.heightReference 设置标牌的高度参考  
     * @param {NearFarScalar} options.scaleByDistance 通过标牌到相机的距离设置缩放比例.
     * @param {DistanceDisplayCondition} options.distanceDisplayCondition 通过标牌到相机的距离设置可见范围.
     */
class Label extends Evented {
  private _ready: boolean;
  private _position: Cartesian3;
  private _lonlat: lonlatTuple;
  private _id: string;
  private _label: any;
  private _options: any;
  private _features: FeatureGroup;
  private _fillColor: Color;
  private _outlineColor: Color;
  private _outlineWidth: number;
  private _show: boolean;
  private _heightReference: HeightReference;
  private _text: string;
  private _backgroundColor: Color;
  private _font: string;
  private _backgroundPadding: Cartesian2;
  private _style: LabelStyle;
  private _pixelOffset: Cartesian2;
  private _translucencyByDistance: any;
  private _pixelOffsetScaleByDistance: any;
  private _horizontalOrigin: HorizontalOrigin;
  private _verticalOrigin: VerticalOrigin;
  private _scale: number;
  private _distanceDisplayCondition: DistanceDisplayCondition;
  private _showBackground: boolean;
  private _eyeOffset: Cartesian3;
  private _disableDepthTestDistance: number;
  private _scaleByDistance: NearFarScalar;

  constructor(position: lonlatTuple | Cartesian3, options?: LabelOptions) {
    super()
    this._ready = false
    options = defaultValue(options, {});

    if (!defined(position)) {
      throw new Error('position未定义!')
    }
    if (position instanceof Cartesian3) {
      this._position = position;
    } else {
      this._lonlat = position;
      this._position = Cartesian3.fromDegrees(position[0], position[1], position[2])
    }
    this._id = defined(options.id) ? options.id : createGuid()
    this._label = undefined
    this._options = options || {}
    this._fillColor = defaultValue(options.fillColor, Color.WHITE)
    this._outlineColor = defaultValue(options.outlineColor, Color.BLACK)
    this._outlineWidth = defined(options.outlineWidth)
      ? options.outlineWidth
      : 1.0;
    this._show = defaultValue(options.show, true)
    this._heightReference = defaultValue(options.heightReference, HeightReference.NONE)
    this._text = defaultValue(options.text, '')
    this._backgroundColor = defaultValue(options.backgroundColor, new Color(0.165, 0.165, 0.165, 0.8))
    this._font = defaultValue(options.font, '30px sans-serif')
    this._backgroundPadding = defaultValue(options.backgroundPadding, new Cartesian2(7, 5))
    this._style = defaultValue(options.style, LabelStyle.FILL_AND_OUTLINE)
    this._pixelOffset = defaultValue(options.pixelOffset, Cartesian2.ZERO)
    this._disableDepthTestDistance = options.disableDepthTestDistance;
    this._translucencyByDistance = defaultValue(options.translucencyByDistance, undefined)
    this._pixelOffsetScaleByDistance = defaultValue(options.pixelOffsetScaleByDistance, undefined)
    this._scaleByDistance = defaultValue(options.scaleByDistance, undefined)
    this._horizontalOrigin = defaultValue(options.horizontalOrigin, HorizontalOrigin.LEFT)
    this._verticalOrigin = defaultValue(options.verticalOrigin, VerticalOrigin.BOTTOM)
    this._scale = defaultValue(options.scale, 1.0)
    this._distanceDisplayCondition = defaultValue(options.distanceDisplayCondition, undefined)
    this._showBackground = defaultValue(options.showBackground, false)
    this._eyeOffset = defaultValue(options.eyeOffset, Cartesian3.ZERO)
  }

  /**
   * 获取label的id
   * @type {String}
   * @memberof Label.prototype
   * @name id
   * @readonly
   */
  get id() {
    return this._id
  }


  get show() {
    return this._show
  }

  set show(show) {
    this._show = show
    this._label && (this._label.show = show)
    this._features && this._features.fire("change:show", { entity: this })
  }

  
    /**
   * 控制Label显隐
   * @memberof Label.prototype
   * @name visible
   */

  get visible() {
    return this._show
  }

  set visible(show) {
    this._show = show
    this._label && (this._label.show = show)
    this._features && this._features.fire("change:show", { entity: this })
  }
  /**
   * 获取或设置此广告牌的高度参考。
   * @memberof Label.prototype
   * @type {HeightReference}
   * @default HeightReference.NONE
   * @name heightReference
   * @memberof Label
   * @instance
   */
  get heightReference() {
    return this._heightReference
  }
  set heightReference(heightReference) {
    this._heightReference = heightReference
    this.update();
  }
  /**
   * 文字内容
   * @memberof Label.prototype
   * @type {String}
   * @name text
   * @memberof Label
   * @instance
   */
  get text() {
    return this._text
  }
  set text(text) {
    this._text = text
    this.update();
    this._features && this._features.fire("change:label", { entity: this })
  }
  /**
   * 字体
   * @memberof Label.prototype
   * @type {String}
   * @default '30px sans-serif'
   * @name font
   * @memberof Label
   * @instance
   */
  get font() {
    return this._font
  }
  set font(font) {
    this._font = font
    this.update();
    this._features && this._features.fire("change:label", { entity: this })
  }


    /**
   * 经纬坐标
   * @memberof Label.prototype
   * @type {lonlatTuple}
   * @name lonlat
   * @memberof Label
   * @instance
   */
  get lonlat() {
    if (defined(this._lonlat)) {
      return this._lonlat;
    } else {
      this._lonlat = cartesianToLonlat(this._label.position);
      return this._lonlat;
    }
  }

  set lonlat(lonlat) {
    this._lonlat = lonlat;
    const carte = Cartesian3.fromDegrees(lonlat[0], lonlat[1], lonlat[2]);
    this._position = carte;
    this._label ? (this._label.position = carte) : null;
    this._features && this._features.fire("change:label", { entity: this })
  }
  /**
   * 获取或设置label的位置
   * @memberof Label.prototype
   * @type {Cartesian3}
   * @name position
   * @memberof Label
   * @instance
   */
  get position() {
    return this._label ? this._label.position : null
  }

  set position(position) {
    this._label ? (this._label.position = position) : null;
    this._position = position
    this._lonlat = undefined;
    this._features && this._features.fire("change:label", { entity: this })
  }
  /**
   * 文字填充色
   * @memberof Label.prototype
   * @type {Color}
   * @default Color.WHITE
   * @name fillColor
   * @memberof Label
   * @instance 
   */
  get fillColor() {
    return this._fillColor
  }

  set fillColor(fillColor) {
    this._fillColor = fillColor;
    this._features && this._features.fire("change:label", { entity: this })
    this.update();
  }
  /**
   * 文字轮廓颜色
   * @memberof Label.prototype
   * @type {Color}
   * @default Color.BLACK
   * @name outlineColor
   * @memberof Label
   * @instance 
   */
  get outlineColor() {
    return this._outlineColor
  }

  set outlineColor(outlineColor) {
    this._outlineColor = outlineColor;
    this.update();
    this._features && this._features.fire("change:label", { entity: this })
  }
  /**
   * 轮廓宽度
   * @memberof Label.prototype
   * @type {Number}
   * @default 1.0
   * @name outlineWidth
   * @memberof Label
   * @instance 
   */
  get outlineWidth() {
    return this._outlineWidth
  }

  set outlineWidth(outlineWidth) {
    this._outlineWidth = outerWidth;
    this.update();
    this._features && this._features.fire("change:label", { entity: this })
  }
  /**
   * 获取或设置此标签的背景颜色.
   * @type {Color}
   * @default new Color(0.165, 0.165, 0.165, 0.8)
   * @name backgroundColor
   * @memberof Label
   * @instance
   */
  get backgroundColor() {
    return this._backgroundColor
  }

  set backgroundColor(backgroundColor) {
    this._backgroundColor = backgroundColor;
    this.update();
    this._features && this._features.fire("change:label", { entity: this })
  }

  /**
   * 获取或设置此标签的背景填充（以像素为单位）。该x值控制水平填充，该y值控制垂直填充。
   * @type {Vector2}
   * @default new Vector2(7, 5)
   * @name backgroundPadding
   * @memberof Label
   * @instance
   */
  get backgroundPadding() {
    return this._backgroundPadding
  }

  set backgroundPadding(backgroundPadding) {
    this._backgroundPadding = backgroundPadding;
    this.update();
    this._features && this._features.fire("change:label", { entity: this })
  }
  /**
   * 获取或设置此标签的样式。
   * @memberof Label.prototype
   * @type {LabelStyle}
   * @default LabelStyle.FILL
   * @name style 
   * @memberof Label
   * @instance
   */
  get style() {
    return this._style
  }

  set style(style) {
    this._style = style;
    this.update();
    this._features && this._features.fire("change:label", { entity: this })
  }
  /**
   * 获取或设置屏幕空间中的像素偏移量与该标签的原点。这通常用于将多个标签和广告牌对齐在同一位置，例如图像和文本。屏幕空间原点是画布的左上角; x从左到右y增加，从上到下增加。 
   * @type {Vector2}
   * @default Vector2.ZERO
   * @name pixelOffset
   * @memberof Label
   * @instance
   */

  get pixelOffset() {
    return this._pixelOffset
  }

  set pixelOffset(pixelOffset) {
    this._pixelOffset = pixelOffset;
    this.update();
    this._features && this._features.fire("change:label", { entity: this })
  }
  /**
   * 根据标签距离相机的距离，获取或设置标签的近透明度和远半透明度属性。
   * 标签的半透明将在之间进行内插NearFarScalar#nearValue和 NearFarScalar#farValue，
   * 而相机距离落在指定的上限和下限内NearFarScalar#near和NearFarScalar#far。
   * 在这些范围之外，标签的半透明度保持固定在最接近的边界。如果未定义，则半透明度禁止将被禁用。
   * @name translucencyByDistance
   * @memberof Label
   * @instance
   */

  get translucencyByDistance() {
    return this._translucencyByDistance
  }

  set translucencyByDistance(translucencyByDistance) {
    this._translucencyByDistance = translucencyByDistance;
    this.update();
    this._features && this._features.fire("change:label", { entity: this })
  }

  /**
   * 像素偏移设置缩放距离
   * @name pixelOffsetScaleByDistance
   * @memberof Label
   * @type {NearFarScalar}
   * @instance
   */
  get pixelOffsetScaleByDistance() {
    return this._pixelOffsetScaleByDistance
  }

  set pixelOffsetScaleByDistance(pixelOffsetScaleByDistance) {
    this._pixelOffsetScaleByDistance = pixelOffsetScaleByDistance;
    this.update();
    this._features && this._features.fire("change:label", { entity: this })
  }
  /**
   * 刻度距离
   * @name scaleByDistance
   * @memberof Label
   * @instance
   */
  get scaleByDistance() {
    return this._scaleByDistance
  }

  set scaleByDistance(scaleByDistance) {
    this._scaleByDistance = scaleByDistance;
    this.update();
    this._features && this._features.fire("change:label", { entity: this })
  }
  /**
   * 获取或设置此标签的水平原点，该标签确定标签是否绘制在其锚定位置的左侧，中央或右侧。 
   * @memberof Label.prototype
   * @type {HorizontalOrigin}
   * @default HorizontalOrigin.LEFT
   * @name horizontalOrigin
   * @memberof Label
   * @instance
   */

  get horizontalOrigin() {
    return this._horizontalOrigin
  }

  set horizontalOrigin(horizontalOrigin) {
    this._horizontalOrigin = horizontalOrigin;
    this.update();
    this._features && this._features.fire("change:label", { entity: this })
  }

  /**
   * 获取或设置此标签的垂直原点，该标签确定标签是否在其上方，下方或其位置的中心。 
   * @memberof Label.prototype
   * @type {VerticalOrigin}
   * @default VerticalOrigin.BASELINE
   * @name verticalOrigin
   * @memberof Label
   * @instance
   */

  get verticalOrigin() {
    return this._verticalOrigin
  }

  set verticalOrigin(verticalOrigin) {
    this._verticalOrigin = verticalOrigin;
    this.update();
    this._features && this._features.fire("change:label", { entity: this })
  }

  /**
   * 设置label缩放比例
   * @memberof Label.prototype
   * @type {Number}
   * @default 1.0
   * @name scale
   * @memberof Label
   * @instance
   */

  get scale() {
    return this._scale
  }

  set scale(scale) {
    this._scale = scale;
    this.update();
    this._features && this._features.fire("change:label", { entity: this })
  }
  /**
   * 获取或设置条件，指定与相机距离显示该标签的距离。
   * @type {DistanceDisplayCondition}
   * @default undefined
   * @name distanceDisplayCondition
   * @memberof Label
   * @instance
   */

  get distanceDisplayCondition() {
    return this._distanceDisplayCondition
  }

  set distanceDisplayCondition(distanceDisplayCondition) {
    this._distanceDisplayCondition = distanceDisplayCondition;
    this.update();
    this._features && this._features.fire("change:label", { entity: this })
  }
  /**
   * 背景色显隐
   * @memberof Label.prototype
   * @default false
   * @type {Boolean}
   * @name show
   * @memberof Label
   * @instance
   */

  get showBackground() {
    return this._showBackground
  }

  set showBackground(showBackground) {
    this._showBackground = showBackground;
    this.update();
    this._features && this._features.fire("change:label", { entity: this })
  }
  /**
   * 获取眼睛偏移的属性
   * @name eyeOffset
   * @memberof Label
   * @instance
   */
  get eyeOffset() {
    return this._eyeOffset
  }
  /**
   * label集合的显隐
   * @name clusterShow
   * @memberof Label
   * @instance
   */
  get clusterShow() {
    return this._label && this._label.clusterShow
  }

  set clusterShow(val) {
    if (this._label) {
      this._label.clusterShow = val
    }
  }
  set eyeOffset(eyeOffset) {
    this._eyeOffset = eyeOffset;
    this.update();
    this._features && this._features.fire("change:label", { entity: this })
  }


  public update() {
    const labels: LabelCollection = this._features.labels
    if (this._label !== undefined) {
      labels.remove(this._label)
    }
    const options = this._options
    const position = this._position

    // let style = options.style || 'fill'
    // style = style.toLowerCase()
    // style = style === 'fillandoutline' ? LabelStyle.FILL_AND_OUTLINE :
    //   options.style === 'outline' ? LabelStyle.OUTLINE :
    //     LabelStyle.FILL
    this._label = labels.add({
      id: this,
      show: this._show,
      position: this._position,
      text: this._text,
      font: this._font,
      fillColor: this._fillColor,
      outlineColor: this._outlineColor,
      outlineWidth: this._outlineWidth,
      showBackground: this._showBackground,
      backgroundColor: this._backgroundColor,
      backgroundPadding: this._backgroundPadding,
      style: this._style,
      pixelOffset: this._pixelOffset,
      eyeOffset: this._eyeOffset,
      horizontalOrigin: this._horizontalOrigin,
      verticalOrigin: this._verticalOrigin,
      scale: this._scale,
      scaleByDistance: this._scaleByDistance,
      disableDepthTestDistance: this._disableDepthTestDistance,
      translucencyByDistance: this._translucencyByDistance,
      pixelOffsetScaleByDistance: this._pixelOffsetScaleByDistance,
      heightReference: this._heightReference,
      distanceDisplayCondition: this._distanceDisplayCondition
    })

  }

  /**
   * 添加至FeatureGroup
   * @param {FeatureGroup}  features
   */
  public addTo(features: FeatureGroup) {
    if (features.map.get(this._id)) {
      console.error("Features id 重复");
    }
    features.map.set(this._id, this)
    this._features = features
    this.update()
    return this
  }

  /**
   * 从FeatureGroup移除
   * @param {FeatureGroup}  features
   */
  public removeFrom(features: FeatureGroup) {
    features.labels.remove(this._label)
    features.map.delete(this.id)
    this._label = undefined
    return this
  }
}
export default Label















