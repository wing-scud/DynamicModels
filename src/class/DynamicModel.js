/** 版本3+manager
 * 基础功能+距离显示样标，
 * 动态更新collection
 * dm类：保存属性，自带方法，
 */
var Cesium = require('cesium/Cesium');
class DynamicModel {
    constructor(options) {
        let { id, collection, modelMatrix, name, code } = options;
        this.id = id;
        this.collection = collection;
        this.modelMatrix = modelMatrix;
        this.name = name;
        this.code = code;
        this.init();
    }
    get model() {
        return this._modelInstance.model;
    }
    get sampledPosition() {
        return this._sampledPosition
    }
    get name() {
        return this._name;
    }
    get path() {
        return this._path;
    }
    get collection() {
        return this._collection;
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
    get billboard() {
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
    get code() {
        return this._code;
    }
    get orientationProperty() {
        return this._orientationProperty;
    }
    set code(code) {
        this._code = code;
    }
    set name(name) {
        this._name = name;
    }
    set billboard(billboard) {
        this._billboard = billboard;
    }
    set sampledPosition(sampledPosition) {
        this._sampledPosition = sampledPosition;
    }
    set orientationProperty(orientationProperty) {
        this._orientationProperty = orientationProperty
    }
    set collection(collection) {
        this._collection = collection;
    }
    set point(point) {
        this._point = point;
    }
    set pathLine(pathLine) {
        this._pathLine = pathLine;
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
        this.path = "";
        this.pathLine = new Cesium.PrimitiveCollection();
        // 有关这个飞机的属性，比如名称等;
        this.attribute = {};
        this.trail = []
    }
    update = (level, index) => {
        if (level !== this.level) {
            if (this.level) {
                this.removePrimitiveByLevel()
            }
            this.addPrimitiveByLevel(level, index);
        }
    }
    updatePositionByTime(time) {
        var position = this.sampledPosition.getValue(time);
        if (this.path === "passed") {
            //添加新的路线线条
            this.drawPassingPath(position)
        }
        var or = this.orientationProperty.getValue(time);
        var matrix3 = Cesium.Matrix3.fromQuaternion(or);
        var modelMatrix = Cesium.Matrix4.fromRotationTranslation(matrix3, position);
        this.modelMatrix = modelMatrix;
        this.modelInstance.modelMatrix = modelMatrix;
    }
    updatePositionByLevel(matrix) {
        this.modelMatrix = matrix;
        switch (this.level) {
            case 'point':
                this.point.position = this.getPosition();
                break;
            case 'billboard':
                this.billboard.position = this.getPosition();
                break;
            case 'model':
                this.modelInstance.modelMatrix = matrix;
                break;
            default:
                return;
        }
    }
    addPrimitiveByLevel(level, index) {
        var result;
        var mb = this;
        switch (level) {
            case 'point':
                result = this.collection.add({
                    show: true,
                    id: mb.id,
                    position: mb.getPosition(),
                    pixelSize: 10.0,
                    color: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.TRANSPARENT,
                    outlineWidth: 0.0,
                    id: mb.id
                })
                this.point = result;
                this.level = 'point';
                break;
            case 'billboard':
                result = this.collection.add({
                    position: mb.getPosition(),
                    id: mb.id,
                    size: 0.5,
                    image: 'static/image/billboard.png',
                })
                this.billboard = result
                this.level = 'billboard';
                break;
            case 'model':
                this.modelInstance = this.collection._instances[index];
                this.level = 'model';
                break;
            default:
                break;
        }
    }
    removePrimitiveByLevel() {
        var level = this.level;
        switch (level) {
            case 'point':
                this.point = undefined
                break;
            case 'billboard':
                this.billboard = undefined
                break;
            case 'model':
                this.modelInstance = undefined
                break;
            default:
                break;
        }
        this.level = undefined;
    }
    clearPathLine() {
        if (this.pathLine.length !== 0 && !this.pathLine.isDestroyed()) {
            this.pathLine.removeAll();
        }
    }
    addTo(manager) {
        this.viewer = manager.viewer;
        this.viewer.scene.primitives.add(this.pathLine);
    }
    rotateAndScaleModel(quaternion, scale) {
            var matrix = this.modelMatrix;
            Cesium.Matrix4.multiplyByMatrix3(matrix, Cesium.Matrix3.fromQuaternion(quaternion), matrix);
            Cesium.Matrix4.multiplyByUniformScale(matrix, scale, matrix);
            this.modelMatrix = matrix;
            this.modelInstance.modelMatrix = matrix;
        }
        //返回最靠近trail且已经航行过的的index；
    drawPath() {
            var lnglatArray = [];
            var color = Cesium.Color.RED;
            for (let i = 0; i < this.trail.length; i++) {
                lnglatArray.push(this.trail[i].lng, this.trail[i].lat, this.trail[i].alt)
            }
            var cartesianArray = Cesium.Cartesian3.fromDegreesArrayHeights(lnglatArray);
            var lineName = this.id + "_" + name
            var polyline = drawLine(color, cartesianArray, lineName)
            this.pathLine.add(polyline);
        }
        //TODO: 每次绘制更新的变量线条=>优化为以samplePositionProperty，time取值更新
    drawPassingPath(position) {
        var path = [];
        var color = Cesium.Color.BLUE;
        path.push(this.getPosition());
        path.push(position);
        var indexName = this.path + "_" + position.x
        var polyline = drawLine(color, path, indexName)
        this.pathLine.add(polyline);
    }
    drawPassedPath() {
        var id = this.getNearTrail(this.getPosition());
        console.log(id)
        if (id !== this.trail.length - 1) {
            var path = [];
            var color = Cesium.Color.BLUE;
            for (let i = this.trail.length - 1; i >= id; i--) {
                path.push(Cesium.Cartesian3.fromDegrees(this.trail[i].lng, this.trail[i].lat, this.trail[i].alt))
            }
            path.push(this.getPosition());
            var indexName = this.path + "_" + "passed";
            var polyline = drawLine(color, path, indexName)
            this.pathLine.add(polyline);
        }
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
        for (let i = this.trail.length - 1; i >= 0; i--) {
            start = Cesium.Cartesian3.fromDegrees(this.trail[i].lng, this.trail[i].lat, this.trail[i].alt)
            Cesium.Cartesian3.negate(start, start);
            end = Cesium.Cartesian3.fromDegrees(this.trail[i - 1].lng, this.trail[i - 1].lat, this.trail[i - 1].alt)
            length1 = Cesium.Cartesian3.magnitude(Cesium.Cartesian3.add(start, position, new Cesium.Cartesian3()))
            length2 = Cesium.Cartesian3.magnitude(Cesium.Cartesian3.add(start, end, new Cesium.Cartesian3()))
            if (length1 < length2) {
                id = i;
                break;
            }
        }
        return id;
    }
}

function drawLine(color, positions, indexName) {
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
export default DynamicModel;