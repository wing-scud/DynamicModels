import Evented from '../Util/Evented';
import Color from '../Util/Color';
import Vector3 from '../Core/Vector3';
import Model from "./Model";
import { isPosition, cartesianToCartographic, cartesianToLonlat,  isLonlat } from '../Util/Util';
import { DistanceDisplayCondition,defaultValue, defined, createGuid, Cartesian3, Transforms, ShadowMode, PointPrimitive,  Primitive, Billboard, lonlatTuple } from '../Engine';
import FeatureGroup from './FeatureGroup';

interface MoveEntityOptions{
	id?: string,
	pixelSize?: number,
	color?: Color,
	visible?: boolean,
	type?: string,
	modelScale?: number,
	scale?: number,
	image: string,
	model: string
}
class MoveEntity extends Evented {
	private _ready: boolean;
	private _tmpLonlat: lonlatTuple;
	private _position: Cartesian3;
	private _lonlat: lonlatTuple;
	private _id: string;
	private _type: string;
	private _pointOption: { id: any; light: boolean; position: Engine.Cartesian3; pixelSize: any; color: any; show: any; distanceDisplayCondition: DistanceDisplayCondition; };
	private _billboardOption: { id: any; position: Engine.Cartesian3; image: any; width: any; height: any; scale: any; distanceDisplayCondition: DistanceDisplayCondition; };
	private _modelOption: { id: any; url: any; modelMatrix: Engine.Matrix4; allowPicking: boolean; shadows: number; scale: any; distanceDisplayCondition: DistanceDisplayCondition; };
	private _pointPrimitive: PointPrimitive;
	private _billboardPrimitive: Billboard;
	private _modelPrimitive: Model;
	private _level: string;
	private _earth: any;
	private _lastLevel: string;
	private _modelReady: boolean;
	constructor(pos: Cartesian3 | lonlatTuple, options: MoveEntityOptions) {
		super();
		this._ready = false;
		options = defaultValue(options, {});
		if (isLonlat(pos)) {
			this._tmpLonlat = this._lonlat = pos as lonlatTuple;
			const [lon, lat, alt] = pos as lonlatTuple;
			this._position = Cartesian3.fromDegrees(lon, lat, alt)
		} else{
			this._position = pos as Cartesian3;
			this._tmpLonlat = this._lonlat = cartesianToLonlat(pos);
		}
		if (!options.image) {
			console.error('options.image is required!');
		}
		if (!options.model) {
			console.error('options.model is required!');
		}
		this._id = defined(options.id) ? options.id : createGuid();
		this._type = defined(options.type) ? options.type : 'ship';
		this._pointOption = {
			id: this._id,
			light: true,
			position: Cartesian3.fromDegrees(pos[0], pos[1], pos[2]),
			pixelSize: defaultValue(options.pixelSize, 2),
			color: defaultValue(options.color, Color.WHITE),
			show: defaultValue(options.visible, true),
			distanceDisplayCondition: new DistanceDisplayCondition(1e6)
		};

		this._billboardOption = {
			id: this._id,
			position: Cartesian3.fromDegrees(pos[0], pos[1], pos[2]),
			image: options.image,
			width: defaultValue(options.pixelSize, 24),
			height: defaultValue(options.pixelSize, 24),
			scale: defaultValue(options.scale, 1.0),
			distanceDisplayCondition: new DistanceDisplayCondition(1e5, 1e6)
		};

		this._modelOption = {
			id: this._id,
			url: options.model,
			modelMatrix: Transforms.eastNorthUpToFixedFrame(
				Cartesian3.fromDegrees(pos[0], pos[1], pos[2])
			),
			allowPicking: true,
			shadows: ShadowMode.DISABLED,
			scale: defaultValue(options.modelScale, 1.0),
			distanceDisplayCondition: new DistanceDisplayCondition(0, 1e5)
		};

		this._ready = true;
		return this;
	}

/**
 * 获取或设置Point的坐标
 * @memberof Point
 * @type {Array}
 */
	get lonlat() {
		if (defined(this._lonlat)){
			return this._lonlat;
		  } else{
			if (this._level === 'point') this._lonlat = cartesianToLonlat(this._pointPrimitive.position);
			else this._lonlat = cartesianToLonlat(this._billboardPrimitive.position);
			return this._lonlat;
		  }
	}

	set lonlat(lonlat) {
		if (defined(lonlat)) {
			if (isPosition(lonlat)) {
				// const level = this.getLevelByHeight(this._earth.camera.position);
				const vec3 = Vector3.fromDegrees(lonlat[0], lonlat[1], lonlat[2]);
				if (this._level === 'point') this._pointPrimitive.position = vec3;
				else if (this._level === 'billboard') this._billboardPrimitive.position = vec3;
				else {
					const origin = vec3;
					const modelMatrix = Transforms.eastNorthUpToFixedFrame(origin);
					this._modelPrimitive.modelMatrix = modelMatrix;
				}
			}
			this._lonlat = lonlat;
	    }
	}

	get position():Cartesian3 {
		if (this._level === 'point') return this._pointPrimitive.position;
		else return this._billboardPrimitive.position;
	}


	set position(pos: Cartesian3) {
		if (this._level === 'point') this._pointPrimitive.position = pos;
		else if (this._level === 'billboard') this._billboardPrimitive.position = pos;
		else {
			const origin = pos;
			const modelMatrix = Transforms.eastNorthUpToFixedFrame(origin);
			this._modelPrimitive.modelMatrix = modelMatrix;
		}
		this._lonlat = undefined;
	}

	get tmpPosition() {
		return this._tmpLonlat;
	}

	set tmpPosition(pos) {
		if (isPosition(pos)) {
			this._tmpLonlat = pos;
		}
	}
   
	get type() {
		return this._type;
	}

	public inViewRec() {
		// console.log(level);
		if (!this._earth.camera.viewBoundingRectangle)
			return true;
		const viewRec = this._earth.camera.viewBoundingRectangle;
		const [lon, lat] = this._tmpLonlat;
		const deltaX = lon - viewRec.x;
		const deltaY = lat - viewRec.y;
		const inRec = deltaX > 0 && deltaX < viewRec.width && deltaY > 0 && deltaY < viewRec.height;
		return inRec;
	}

	public update = () => {
		// if (this._lastCameraPosition.equals(this._earth.camera.position) === false) {
		let inRec;
		const level = this.getLevelByHeight(this._earth.camera.positionCartographic);

		if (level !== this._lastLevel) {
			inRec = this.inViewRec();
			if (!inRec) return;
			this.addEntityByLevel(level);
			this._lastLevel = level;
		}
		// console.log('test')
		if (this._lonlat[0] !== this._tmpLonlat[0] || this._lonlat[1] !== this._tmpLonlat[1]) {
			if (inRec === undefined) {
				inRec = this.inViewRec();
				if (!inRec) return;
			}
			// console.log(level)
			const vec3 = Vector3.fromDegrees(this._tmpLonlat[0], this._tmpLonlat[1], this._tmpLonlat[2]);
			if (level === 'point') {
				if (this._pointPrimitive) this._pointPrimitive.position = vec3;
			}
			else if (level === 'billboard') {
				if (this._billboardPrimitive) {
					this._billboardPrimitive.position = vec3;
				}
			}
			else {
				if (this._modelReady) {
					const origin = vec3;
					const modelMatrix = Transforms.eastNorthUpToFixedFrame(origin);
					this._modelPrimitive.modelMatrix = modelMatrix;
				}
			}
			// console.log('in~~');
			this._lonlat[0] = this._tmpLonlat[0];
			this._lonlat[1] = this._tmpLonlat[1];
		}
		// console.log(this._id, ' ==> ', level);
	}

	public getLevelByHeight(cartographic:any ) {// >>>
		if (!cartographic || cartographic.height > 1e6) {
			return 'point';
		} else if (cartographic.height <= 1e6 && cartographic.height > 1e5) {
			return 'billboard';
		}
		return 'model';
	}

	public addEntityByLevel(level: string) {
		switch (level) {
			case 'point':
				this._addPoint();
				this._level = 'point';
				break;
			case 'billboard':
				this._addBillboard();
				this._level = 'billboard';
				break;
			case 'model':
				this._addModel();
				this._level = 'model';
				break;
			default:
				break;
		}
	}

	public removeEntityByLevel(level) {
		switch (level) {
			case 'point':
				this._removePoint();
				break;
			case 'billboard':
				this._removeBillboard();
				break;
			case 'model':
				this._removeModel();
				break;
			default:
				break;
		}
		this._level = undefined;
	}

	public _addPoint() {
		const features = this._earth.features;
		// features._map.set(this._id, this);
		if (!this._pointPrimitive) {
			this._pointPrimitive = features._pointPrimitivesLight.add(this._pointOption);
		}
	}

	public _removePoint() {
		const features = this._earth.features;
		// features._map.remove(this._id, this);
		features._pointPrimitivesLight.remove(this._pointPrimitive);
	}

	public _addBillboard() {
		if (!this._billboardPrimitive) {
			const features = this._earth.features;
			// features._map.set(this._id, this);
			this._billboardPrimitive = features._billboardsLight.add(this._billboardOption);
		}
	}

	public _removeBillboard() {
		const features = this._earth.features;
		// features._map.remove(this._id, this);
		features._billboardsLight.remove(this._billboardPrimitive);
	}

	public _addModel() {
		const features = this._earth.features;
		// features._map.set(this._id, this);
		if (!this._modelPrimitive) {
			console.log('model~~');
			this._modelPrimitive = this._earth.scene.primitives.add(Model.fromGltf(this._modelOption));
			this._modelPrimitive.readyPromise.then(() => {
				this._modelReady = true;
			});
		}
	}

	public _removeModel() {
		const features = this._earth.features;
		// features._map.remove(this._id, this);
		this._earth.scene.primitives.remove(this._modelPrimitive);
	}

	public addTo(features: FeatureGroup) {
		if(features.map.get(this._id)){
			console.error("Features id 重复");
		}
		if (this._ready === false) {
			return false;
		}
		this._earth = features.earth;
		this._earth.camera.on('change', this.update);
		features.map.set(this._id, this);
		this.update();
		return this;
	}

	public removeFrom(features: FeatureGroup) {
		this._earth.camera.off('change', this.update);
		this._removeModel();
		this._removeBillboard();
		this._removePoint();
		features.map.delete(this._id);
		this._earth = undefined;
	}
}

export default MoveEntity;
