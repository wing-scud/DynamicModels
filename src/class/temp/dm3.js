/** 版本3+manager
 * 基础功能+距离显示样标，
 * 动态更新collection
 * dm类：保存属性，自带方法，
 */
var geohash = require('ngeohash');
var Cesium = require('cesium/Cesium');
class DynamicModel {
    constructor(options) {
        this.id = options.id;
        this.modelInstance = options.instance;
        if (options.trail !== undefined) {
            this.trail = options.trail;
        } else {
            this.trail = [];
        }
        this.init();
    }
    get model() {
        return this._modelInstance.model;
    }
    get path() {
        return this._path;
    }
    get trail() {
        return this._trail;
    }
    get modelMatrix() {
        return this._modelMatrix;
    }
    get id() {
        return this._id;
    }
    get attribute() {
        return this._attribute;
    }
    get historyRoute() {
        return this._historyRoute;
    }
    get level() {
        return this._level;
    }
    get billBoard() {
        return this._billboard;
    }
    get point() {
        return this._point;
    }
    get modelInstance() {
        return this._modelInstance;
    }
    get pathLine() {
        return this._pathLine;
    }
    set level(level) {
        this._level = level;
    }
    set billBoard(billBoard) {
        this._billBoard = billBoard;
    }
    set point(point) {
        this._point = point;
    }
    set pathLine(pathLine) {
        this._pathLine = pathLine;
    }
    set historyRoute(historyRoute) {
        this._historyRoute = historyRoute;
        this.historyRouteControl();
    }
    set path(path) {
        this._path = path;
        if (path === "passed") {
            this.drawPassedPath()
        } else if (path == "path") {
            this.drawPath();
        }
    }
    set modelMatrix(modelMatrix) {
        this._modelMatrix = modelMatrix;
        switch (this._level) {
            case 'point':
                this._point.position = this.getPosition();
                break;
            case 'billboard':
                this._billBoard.position = this.getPosition();
                break;
            case 'model':
                this._modelInstance.modelMatrix = modelMatrix;
                break;
            default:
                return;
        }
    }
    set trail(trail) {
        this._trail = trail;
    }
    set id(id) {
        this._id = id;
    }
    set attribute(attribute) {
        this._attribute = attribute;
    }
    set modelInstance(modelInstance) {
        this._modelInstance = modelInstance;
    }
    init() {
        this.level = this.getLevelByHeight();
        this.clock = new Cesium.Clock();
        this.historyRoute = false;
        this.modelMatrix = this.modelInstance.modelMatrix;
        this.sampledPosition = new Cesium.SampledPositionProperty();
        this.sampledPosition.setInterpolationOptions({
            interpolationDegree: 2,
            interpolationAlgorithm: Cesium.HermitePolynomialApproximation
        });
        this.orientationProperty = new Cesium.VelocityOrientationProperty(this.sampledPosition);
        this.path = "";
        this.pathLine = new Cesium.PrimitiveCollection();
        // 有关这个飞机的属性，比如名称等
        this.attribute = {};
    }
    rotateModel(quaternion) {
            var matrix = this.modelMatrix;
            this.modelMatrix = Cesium.Matrix.multiplyByMatrix3(matrix, Cesium.Matrix3.fromQuaternion(quaternion));
        }
        //返回最靠近trail且已经航行过的的index；
    drawPath() {
            this.clearPathLine();
            var lnglatArray = [];
            var color = Cesium.Color.RED;
            for (let i = 0; i < this.trail.length; i++) {
                lnglatArray.push(this.trail[i].lng, this.trail[i].lat, this.trail[i].alt)
            }
            var cartesianArray = Cesium.Cartesian3.fromDegreesArrayHeights(lnglatArray);
            var lineName = this.id + "_" + name
            var polyline = this.drawLine(color, cartesianArray, lineName)
            this.pathLine.add(polyline);
        }
        //每次绘制更新的变量线条
    drawPassingPath(position) {
        var path = [];
        var color = Cesium.Color.BLUE;
        path.push(this.getPosition());
        path.push(position);
        var indexName = this.path + "_" + position.x
        var polyline = this.drawLine(color, path, indexName)
        this.pathLine.add(polyline);
    }
    drawPassedPath() {
        var id = this.getNearTrail(this.getPosition());
        if (id !== this.trail.length - 1) {
            var path = [];
            var color = Cesium.Color.BLUE;
            for (let i = this.trail.length - 1; i >= id; i--) {
                path.push(Cesium.Cartesian3.fromDegrees(this.trail[i].lng, this.trail[i].lat, this.trail[i].alt))
            }
            path.push(this.getPosition());
            var indexName = this.path + "_" + "passed";
            var polyline = this.drawLine(color, path, indexName)
            this.pathLine.add(polyline);
        }
    }
    update = () => {
        var level = this.getLevelByHeight(this.viewer.camera.positionCartographic)
        if (level !== this.level) {
            this.addPrimitiveByLevel(level);
        }
        if (this.clock.shouldAnimate) {
            var time = this.clock.currentTime;
            var position = this.sampledPosition.getValue(time);
            var or = this.orientationProperty.getValue(time);
            var matrix3 = Cesium.Matrix3.fromQuaternion(or);
            var matrix = Cesium.Matrix4.fromRotationTranslation(matrix3, position);
            if (this.path === "passed") {
                //添加新的路线线条
                this.drawPassingPath(position)
            }
            this.modelMatrix = matrix;
            this.clock.tick();
        }
    }
    historyRouteControl() {
            if (this.historyRoute) {
                this.sampledPosition = new Cesium.SampledPositionProperty();
                this.orientationProperty = new Cesium.VelocityOrientationProperty(this.sampledPosition);
                let trail = this.trail;
                let start = Cesium.JulianDate.fromDate(new Date(trail[trail.length - 1].ts * 1000));
                let end = Cesium.JulianDate.fromDate(new Date(trail[0].ts * 1000));
                this.clock.startTime = start.clone();
                this.clock.stopTime = end.clone();
                this.clock.currentTime = start.clone();
                this.clock.clockRange = Cesium.ClockRange.CLAMPED;
                this.clock.clockStep = Cesium.ClockStep.TICK_DEPENDENT;
                for (let i = trail.length - 1; i >= 0; i--) {
                    this.sampledPosition.addSample(Cesium.JulianDate.fromDate(new Date(trail[i].ts * 1000)), Cesium.Cartesian3.fromDegrees(trail[i].lng, trail[i].lat, trail[i].alt));
                }
                this.orientationProperty = new Cesium.VelocityOrientationProperty(this.sampledPosition);
                this.clock.shouldAnimate = true;
                this.update()
            } else {
                this.clock.shouldAnimate = false;
                // 停止历史轨迹应该飞行回到原来位置
            }
        }
        //实时更新数据，计算朝向；调整方向
    updatePosition(position, heading) {
        if (!this.historyRoute) {
            heading = Cesium.Math.toRadians(heading);
            var hpr = new Cesium.HeadingPitchRoll(heading, 0, 0);
            var modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(position, hpr);
            this.modelMatrix = modelMatrix;
        }
    }
    addPoint() {
        var viewer = this.viewer;
        var mb = this;
        //     var pointCollection=new Cesium.PointCollection()
        if (!this.point) {
            var point = new Cesium.PointPrimitive({
                show: true,
                position: mb.getPosition(),
                pixelSize: 10.0,
                color: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.TRANSPARENT,
                outlineWidth: 0.0,
                id: mb.id + '_point'
            })
            this.point = viewer.scene.primitives.add(point);
        }
    }

    removePoint() {
        var viewer = this.viewer;
        //collcetion remove
        viewer.scene.primitives.remove(this.point)
    }

    addBillboard() {
        var viewer = this.viewer;
        var mb = this;
        if (!this.billboard) {
            var billboard = new Cesium.Billboard({
                position: mb.getPosition(),
                image: 'static/image/billboard.png',
                id: mb.id + '_billboard'
            });
            this.billBoard = viewer.scene.primitives.add(billboard);
        }
    }

    removeBillboard() {
        var viewer = this.viewer;
        //collcetion remove
        viewer.scene.primitives.remove(this.billBoard)
    }

    addModel() {
        var viewer = this.viewer;
        var mb = this;
        if (!this.model) {
            console.log('model~~');
            // this._modelPrimitive = this._earth.scene.primitives.add(Model.fromGltf(this._modelOption));
            // this._modelPrimitive.readyPromise.then(() => {
            //     this._modelReady = true;
            // });
        }
    }
    addParticleSystem() {
        var viewer = this.viewer;
        var model = this;
        var particleSystem = viewer.scene.primitives.add(new Cesium.ParticleSystem({
            image: 'static/smoke.png',
            emissionRate: 15,
            emitter: new Cesium.CircleEmitter(100),
            startColor: Cesium.Color.RED.withAlpha(0.7),
            endColor: Cesium.Color.WHITE.withAlpha(0.2),
            startScale: 1.2,
            endScale: 4,
            minimumParticleLife: 1.0,
            maximumParticleLife: 4.0,
            minimumSpeed: 2.0,
            maximumSpeed: 5.0,
            minimumImageSize: new Cesium.Cartesian2(30.0, 30.0),
            maximumImageSize: new Cesium.Cartesian2(60.0, 60.0),
            lifetime: 8.0,
            modelMatrix: model.modelMatrix,
            emitterModelMatrix: computeEmitterModelMatrix(),
            updateCallback: applyGravity //回调实现重力
        }));
        this.clock.onTick.addEventListener(function() {
            particleSystem.modelMatrix = model.modelMatrix;
            particleSystem.emitterModelMatrix = computeEmitterModelMatrix();
        });
    }
    clearPathLine() {
        if (this.pathLine.length !== 0 && !this.pathLine.isDestroyed()) {
            this.pathLine.removeAll();
        }
    }
    addTo(viewer) {
        var dm = this;
        this.viewer = viewer;
        this.viewer.scene.primitives.add(this.pathLine);
        dm.viewer.scene.preRender.addEventListener(dm.update); //需要不需要用ontick clock，
    }
    getOrientation() {
        var matrix4 = this.modelMatrix;
        var matrix3 = new Cesium.Matrix3()
        matrix3 = Cesium.Matrix4.getMatrix3(matrix4, matrix3)
        var quaternion = Cesium.Quaternion.fromRotationMatrix(matrix3, new Cesium.Quaternion());
        return quaternion;
    }

    getPosition() {
            var matrix4 = this.modelMatrix;
            var cartesian4 = Cesium.Matrix4.getColumn(matrix4, 3, new Cesium.Cartesian4());
            var result = Cesium.Cartesian3.fromCartesian4(cartesian4);
            return result;
        }
        //返回 最近刚行驶过trail
    getNearTrail(position) {
        var id = -1;
        var start = new Cesium.Cartesian3();
        var end = new Cesium.Cartesian3();
        var length1 = 0;
        var length2 = 0;
        for (let i = 0; i < this.trail.length - 1; i++) {
            start = Cesium.Cartesian3.fromDegrees(this.trail[i].lng, this.trail[i].lat, this.trail[i].alt)
            Cesium.Cartesian3.negate(start, start);
            end = Cesium.Cartesian3.fromDegrees(this.trail[i + 1].lng, this.trail[i + 1].lat, this.trail[i + 1].alt)
            length1 = Cesium.Cartesian3.magnitude(Cesium.Cartesian3.add(start, position, new Cesium.Cartesian3()))
            length2 = Cesium.Cartesian3.magnitude(Cesium.Cartesian3.add(start, end, new Cesium.Cartesian3()))
            if (length1 < length2) {
                id = i;
                break;
            }
        }
        return id;
    }
    getLevelByHeight(cartographic) { // >>>
        if (!cartographic || cartographic.height > 1e6) {
            return 'point';
        } else if (cartographic.height <= 1e6 && cartographic.height > 1e5) {
            return 'billboard';
        }
        return 'model';
    }
    addPrimitiveByLevel(level) {
        switch (level) {
            case 'point':
                this.addPoint();
                this.level = 'point';
                break;
            case 'billboard':
                this.addBillboard();
                this.level = 'billboard';
                break;
            case 'model':
                this.addModel();
                this.level = 'model';
                break;
            default:
                break;
        }
    }
    drawLine(color, positions, indexName) {
        var geometry = new Cesium.PolylineGeometry({
            positions: positions,
            windexth: 8,
        })
        var instance = new Cesium.GeometryInstance({
            geometry: geometry,
            id: indexName,
            attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(color)
            }
        })
        var polyline = new Cesium.Primitive({
            geometryInstances: instance,
            appearance: new Cesium.PolylineColorAppearance({ translucent: false })
        })
        return polyline;
    }
}

function applyGravity(particle, time) {
    var gravityVector = new Cesium.Cartesian3();
    var gravity = -(9.8 * 9.8);
    var position = particle.position;
    Cesium.Cartesian3.normalize(position, gravityVector);
    Cesium.Cartesian3.multiplyByScalar(gravityVector, gravity * time, gravityVector);
    particle.velocity = Cesium.Cartesian3.add(particle.velocity, gravityVector, particle.velocity);
}

function computeEmitterModelMatrix() {
    var emitterModelMatrix = new Cesium.Matrix4();
    var translation = new Cesium.Cartesian3();
    var rotation = new Cesium.Quaternion();
    var hpr = new Cesium.HeadingPitchRoll();
    var trs = new Cesium.TranslationRotationScale();
    let degreeH = Cesium.Math.randomBetween(0, 180);
    let degreeP = Cesium.Math.randomBetween(0, 180);
    let degreeR = Cesium.Math.randomBetween(0, 180); //未旋转？？？
    hpr = Cesium.HeadingPitchRoll.fromDegrees(degreeH, degreeP, degreeR, hpr);
    trs.translation = Cesium.Cartesian3.fromElements(-120, 0.0, 1.4, translation); //平移
    trs.rotation = Cesium.Quaternion.fromHeadingPitchRoll(hpr, rotation); // 旋转
    return Cesium.Matrix4.fromTranslationRotationScale(trs, emitterModelMatrix);
}
export default DynamicModel;