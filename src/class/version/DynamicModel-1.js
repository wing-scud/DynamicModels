/**基础版
 *  primitive加载
 *  数据量太大，卡顿
 */
// import Cesium from 'cesium/Cesium';
// class DynamicModel {
//     constructor(options) {
//         this.model = options.model;
//         this.id = options.id;
//         if (options.trail !== undefined) {
//             this.trail = options.trail;
//         } else {
//             this.trail = [];
//         }
//         this.init();
//     }
//     get model() {
//         return this._model;
//     }
//     get path() {
//         return this._path;
//     }
//     get trail() {
//         return this._trail;
//     }
//     get modelMatrix() {
//         return this._modelMatrix;
//     }
//     get id() {
//         return this._id;
//     }
//     get show() {
//         return this._show;
//     }
//     get attribute() {
//         return this._attribute;
//     }
//     get color() {
//         return this._color;
//     }
//     get historyRoute() {
//         return this._historyRoute;
//     }
//     set historyRoute(historyRoute) {
//         this._historyRoute = historyRoute;
//         this.historyRouteControl();
//     }
//     set model(model) {
//         this._model = model;
//         if (this._modelMatrix) {
//             this.model.modelMatrix = this._modelMatrix;
//         }
//     }
//     set path(path) {
//         this._path = path;
//         if (path === "passed") {
//             this.drawPassedPath()
//         } else if (path == "path") {
//             this.drawPath();
//         }
//     }
//     set modelMatrix(modelMatrix) {
//         this._modelMatrix = modelMatrix;
//         this.model.modelMatrix = modelMatrix;
//     }
//     set trail(trail) {
//         this._trail = trail;
//     }
//     set id(id) {
//         this._id = id;
//         this._model.id = id;
//     }
//     set show(show) {
//         this._show = show;
//         this._model.show = show;
//     }
//     set color(color) {
//         this._color = color;
//         this._model.color = color;
//     }
//     set attribute(attribute) {
//         this._attribute = attribute;
//     }
//     init() {
//         this.clock = new Cesium.Clock();
//         this.historyRoute = false;
//         this.modelMatrix = this.model.modelMatrix;
//         this.sampledPosition = new Cesium.SampledPositionProperty();
//         this.sampledPosition.setInterpolationOptions({
//             interpolationDegree: 2,
//             interpolationAlgorithm: Cesium.HermitePolynomialApproximation
//         });
//         this.orientationProperty = new Cesium.VelocityOrientationProperty(this.sampledPosition);
//         this.color = Cesium.Color.WHITE;
//         this.show = true;
//         this.path = "";
//         this.pathLine = new Cesium.PrimitiveCollection();
//         // 有关这个飞机的属性，比如名称等
//         this.attribute = new Object();
//     }
//     changeModel(model, options) {
//         var { attribute, trail, color, id, show } = options;
//         this.viewer.scene.primitives.remove(this.model);
//         this.model = model;
//         this.viewer.scene.primitives.add(this.model);
//         if (attribute !== undefined) {
//             this.attribute = attribute;
//         }
//         if (show !== undefined) {
//             this.show = show;
//         }
//         if (color !== undefined) {
//             this.color = color;
//         }
//         if (trail !== undefined) {
//             this.trail = trail;
//         }
//         if (id !== undefined) {
//             this.id = id;
//         }
//     }
//     rotateModel(quaternion) {
//             var matrix = this.modelMatrix;
//             this.modelMatrix = Cesium.Matrix.multiplyByMatrix3(matrix, Cesium.Matrix3.fromQuaternion(quaternion));
//         }
//         //返回最靠近trail且已经航行过的的index；
//     drawPath() {
//             this.clearPathLine();
//             var lnglatArray = [];
//             var color = Cesium.Color.RED;
//             for (let i = 0; i < this.trail.length; i++) {
//                 lnglatArray.push(this.trail[i].lng, this.trail[i].lat, this.trail[i].alt)
//             }
//             var cartesianArray = Cesium.Cartesian3.fromDegreesArrayHeights(lnglatArray);
//             var lineName = this.id + "_" + name
//             var polyline = this.drawLine(color, cartesianArray, lineName)
//             this.pathLine.add(polyline);
//         }
//         //每次绘制更新的变量线条
//     drawPassingPath(position) {
//         var path = [];
//         var color = Cesium.Color.GRAY;
//         path.push(this.getPosition());
//         path.push(position);
//         var idName = this.path + "_" + position.x
//         var polyline = this.drawLine(color, path, idName)
//         this.pathLine.add(polyline);
//     }
//     drawPassedPath() {
//         var index = this.getNearTrail(this.getPosition());
//         if (index !== this.trail.length - 1) {
//             var path = [];
//             var color = Cesium.Color.GRAY;
//             for (let i = this.trail.length - 1; i >= index; i--) {
//                 path.push(Cesium.Cartesian3.fromDegrees(this.trail[i].lng, this.trail[i].lat, this.trail[i].alt))
//             }
//             path.push(this.getPosition());
//             var idName = this.path + "_" + "passed";
//             var polyline = this.drawLine(color, path, idName)
//             this.pathLine.add(polyline);
//         }
//     }
//     update = () => {
//         if (this.clock.shouldAnimate) {
//             var time = this.clock.currentTime;
//             var position = this.sampledPosition.getValue(time);
//             var or = this.orientationProperty.getValue(time);
//             var matrix3 = Cesium.Matrix3.fromQuaternion(or);
//             var matrix = Cesium.Matrix4.fromRotationTranslation(matrix3, position);
//             if (this.path === "passed") {
//                 //添加新的路线线条
//                 this.drawPassingPath(position)
//             }
//             this.modelMatrix = matrix;
//             this.clock.tick();
//         }
//     }
//     historyRouteControl() {
//             if (this.historyRoute) {
//                 this.sampledPosition = new Cesium.SampledPositionProperty();
//                 this.orientationProperty = new Cesium.VelocityOrientationProperty(this.sampledPosition);
//                 let trail = this.trail;
//                 let start = Cesium.JulianDate.fromDate(new Date(trail[trail.length - 1].ts * 1000));
//                 let end = Cesium.JulianDate.fromDate(new Date(trail[0].ts * 1000));
//                 this.clock.startTime = start.clone();
//                 this.clock.endTime = end.clone();
//                 this.clock.currentTime = start.clone();
//                 this.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
//                 this.clock.multiplier = 1;
//                 for (let i = trail.length - 1; i >= 0; i--) {
//                     this.sampledPosition.addSample(Cesium.JulianDate.fromDate(new Date(trail[i].ts * 1000)), Cesium.Cartesian3.fromDegrees(trail[i].lng, trail[i].lat, trail[i].alt));
//                 }
//                 this.orientationProperty = new Cesium.VelocityOrientationProperty(this.sampledPosition);
//                 this.clock.shouldAnimate = true;
//             } else {
//                 this.clock.shouldAnimate = false;
//                 // 停止历史轨迹应该飞行回到原来位置
//             }
//         }
//         //实时更新数据，计算朝向；调整方向
//     updatePosition(position, heading) {
//         if (!this.historyRoute) {
//             heading = Cesium.Math.toRadians(heading);
//             var hpr = new Cesium.HeadingPitchRoll(heading, 0, 0);
//             var modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(position, hpr);
//             this.modelMatrix = modelMatrix;
//         }
//     }

//     addParticleSystem() {
//         var viewer = this.viewer;
//         var model = this;
//         var particleSystem = viewer.scene.primitives.add(new Cesium.ParticleSystem({
//             image: 'static/smoke.png',
//             emissionRate: 15,
//             emitter: new Cesium.CircleEmitter(100),
//             startColor: Cesium.Color.RED.withAlpha(0.7),
//             endColor: Cesium.Color.WHITE.withAlpha(0.2),
//             startScale: 1.2,
//             endScale: 4,
//             minimumParticleLife: 1.0,
//             maximumParticleLife: 12.0,
//             minimumSpeed: 2.0,
//             maximumSpeed: 25.0,
//             minimumImageSize: new Cesium.Cartesian2(30.0, 30.0),
//             maximumImageSize: new Cesium.Cartesian2(160.0, 160.0),
//             lifetime: 8.0,
//             modelMatrix: model.modelMatrix,
//             emitterModelMatrix: computeEmitterModelMatrix(),
//             //  updateCallback: applyGravity //回调实现重力
//         }));
//         var eventCallback = this.clock.onTick.addEventListener(function(time) {
//             particleSystem.modelMatrix = model.modelMatrix
//             particleSystem.emitterModelMatrix = computeEmitterModelMatrix();
//         });
//         return [particleSystem, eventCallback];
//     }
//     clearPathLine() {
//         if (this.pathLine.length !== 0 && !this.pathLine.isDestroyed()) {
//             this.pathLine.removeAll();
//         }
//     }
//     addToViewer(viewer) {
//         var dm = this;
//         this.viewer = viewer;
//         this.viewer.scene.primitives.add(this.model);
//         this.viewer.scene.primitives.add(this.pathLine);
//         dm.viewer.scene.preRender.addEventListener(dm.update); //需要不需要用ontick clock，
//     }
//     getOrientation() {
//         var matrix4 = this.modelMatrix;
//         var matrix3 = new Cesium.Matrix3()
//         matrix3 = Cesium.Matrix4.getRotation(matrix4, matrix3)
//         var quaternion = Cesium.Quaternion.fromRotationMatrix(matrix3, new Cesium.Quaternion());
//         return quaternion;
//     }

//     getPosition() {
//             var matrix4 = this.modelMatrix;
//             var cartesian4 = Cesium.Matrix4.getColumn(matrix4, 3, new Cesium.Cartesian4());
//             var result = Cesium.Cartesian3.fromCartesian4(cartesian4);
//             return result;
//         }
//         //返回 最近刚行驶过trail
//     getNearTrail(position) {
//         var index = -1;
//         var start = new Cesium.Cartesian3();
//         var end = new Cesium.Cartesian3();
//         var length1 = 0;
//         var length2 = 0;
//         for (let i = 0; i < this.trail.length - 1; i++) {
//             start = Cesium.Cartesian3.fromDegrees(this.trail[i].lng, this.trail[i].lat, this.trail[i].alt)
//             Cesium.Cartesian3.negate(start, start);
//             end = Cesium.Cartesian3.fromDegrees(this.trail[i + 1].lng, this.trail[i + 1].lat, this.trail[i + 1].alt)
//             length1 = Cesium.Cartesian3.magnitude(Cesium.Cartesian3.add(start, position, new Cesium.Cartesian3()))
//             length2 = Cesium.Cartesian3.magnitude(Cesium.Cartesian3.add(start, end, new Cesium.Cartesian3()))
//             if (length1 < length2) {
//                 index = i;
//                 break;
//             }
//         }
//         return index;
//     }
//     drawLine(color, positions, idName) {
//         var geometry = new Cesium.PolylineGeometry({
//             positions: positions,
//             width: 8,
//         })
//         var instance = new Cesium.GeometryInstance({
//             geometry: geometry,
//             id: idName,
//             attributes: {
//                 color: Cesium.ColorGeometryInstanceAttribute.fromColor(color)
//             }
//         })
//         var polyline = new Cesium.Primitive({
//             geometryInstances: instance,
//             appearance: new Cesium.PolylineColorAppearance({ translucent: false })
//         })
//         return polyline;
//     }
// }

// function applyGravity(particle, time) {
//     var gravityVector = new Cesium.Cartesian3();
//     var gravity = -(9.8 * 9.8);
//     var position = particle.position;
//     Cesium.Cartesian3.normalize(position, gravityVector);
//     Cesium.Cartesian3.multiplyByScalar(gravityVector, gravity * time, gravityVector);
//     particle.velocity = Cesium.Cartesian3.add(particle.velocity, gravityVector, particle.velocity);
// }

// function computeEmitterModelMatrix() {
//     var emitterModelMatrix = new Cesium.Matrix4();
//     var translation = new Cesium.Cartesian3();
//     var rotation = new Cesium.Quaternion();
//     var hpr = new Cesium.HeadingPitchRoll();
//     var trs = new Cesium.TranslationRotationScale();
//     let degreeH = Cesium.Math.randomBetween(0, 180);
//     let degreeP = Cesium.Math.randomBetween(0, 180);
//     let degreeR = Cesium.Math.randomBetween(0, 180); //未旋转？？？
//     hpr = Cesium.HeadingPitchRoll.fromDegrees(degreeH, degreeP, degreeR, hpr);
//     trs.translation = Cesium.Cartesian3.fromElements(-120, 0.0, 1.4, translation); //平移
//     trs.rotation = Cesium.Quaternion.fromHeadingPitchRoll(hpr, rotation); // 旋转
//     return Cesium.Matrix4.fromTranslationRotationScale(trs, emitterModelMatrix);
// }
// export default DynamicModel;