<template>
<div id="cesiumContainer">
    <div id="editor">
        <el-collapse v-model="activeNames">
            <el-collapse-item title="统一控制模块" name="1">
                <div class="operater">
                    <el-button type="primary" size="small " plain @click="createMbs()">创建动标组</el-button>
                </div>
                <div class="operater">
                    <el-button type="primary" size="small " plain @click="deleteMbs()">清除动标</el-button>
                </div>
            </el-collapse-item>
            <el-collapse-item title="实时控制模块" name="2" :disabled="history">
                <div class="operater">
                    <el-switch v-model="intervalSwitch" :disabled="history" active-text="实时更新" inactive-text="停止">
                    </el-switch>
                </div>
            </el-collapse-item>
            <el-collapse-item title="历史轨迹控制模块" name="3" :disabled="!history">
                <div class="operater">
                    <el-select v-model="pathChooseValue" placeholder="请选择" @change="pathChoose()" size="small">
                        <el-option v-for="item in pathOptions" :key="item.value" :label="item.label" :value="item.value">
                        </el-option>
                    </el-select>
                </div>

                <div class="operater">
                    <el-button type="primary" size="small " plain @click=" trackModel()">跟踪目标</el-button>
                </div>
                <div class="operater">
                    <span> 时钟 &nbsp;&nbsp;&nbsp;&nbsp;</span>
                    <el-slider class="slider" v-model="time" :min="minTime" :max="maxTime" :format-tooltip="formatTooltip" @input="changeTime"></el-slider>
                </div>
                <div class="operater">
                    <span> 播放速度</span>
                    <el-slider class="slider" v-model="multipiler" :min="-100" :max="100"></el-slider>
                </div>
            </el-collapse-item>
        </el-collapse>

    </div>
    <el-drawer custom-class="drawer" :visible.sync="drawer" :modal="false" direction="ltr" :before-close="closeDrawer">
        <template slot="title">
            <div class="modelName">
                <span v-text="name"></span>
            </div>
        </template>
        <div class="modelImage">
            <el-image style="width:100%; height: 100%" :src="url" fit="fill">
            </el-image>
        </div>
        <div class="attributeBar">
            经度 ：<span v-text="position[0]"></span><br>
            纬度 ：<span v-text="position[1]"></span><br>
            高度 ：<span v-text="position[2]"></span><br>
        </div>
        <div class="attributeBar">
            <el-switch v-model="history" active-text="历史轨迹" inactive-text="暂停">
            </el-switch>
        </div>
        <div class="attributeBar">
            <el-button type="primary" size="small" @click="editMb()">旋转45°,放大5倍
            </el-button>
        </div>
        <div class="attributeBar">
            <el-button type="primary" size="small" @click="changeMb()">更改模型
            </el-button>
        </div>
    </el-drawer>
</div>
</template>

<script>
var Cesium = require('cesium/Cesium');
import fetch from "node-fetch"
import DynamicModel from "../class/DynamicModel"
import DynamicManager from "../class/DynamicManager"
export default {
    name: 'DmManagerPage',
    data() {
        return {
            pathOptions: [{
                value: 'passed',
                label: '已飞行轨迹'
            }, {
                value: 'path',
                label: '飞行路径'
            }],
            pathChooseValue: "",
            basePath: "static/data/test/h1/",
            interval: "",
            cameraPick: false,
            time: 0,
            minTime: 0,
            maxTime: 0,
            dmManager: "",
            name: "",
            drawer: false,
            url: require("../assets/airplane.jpg"),
            position: [],
            history: false,
            intervalSwitch: false,
            multipiler: 1,
            activeNames: ['1']
        }
    },
    mounted() {
        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxZTg5ODRkNS00NTViLTQ3MzEtYWE4ZS0zNmNjYzgzYzQ0MDgiLCJpZCI6MTcyMDAsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NzE3OTk5NzJ9.6gFtjhsys4gwUDc8m1C54mzZcM6fP_BbdnrSv7mro4o';
        var viewer = new Cesium.Viewer('cesiumContainer', {
            animation: false, //隐藏时钟
            homeButton: false,
            fullscreenButton: false,
            geocoder: false, //隐藏搜索
            sceneModePicker: false, // 隐藏二三维切换
            baseLayerPicker: false, //隐藏图层管理
            timeline: false,
            infoBox: false, // 隐藏点击entity信息框
            navigationHelpButton: false, //隐藏帮助按钮
            selectionIndicator: false // 隐藏点击entity绿框
        });
        this.dmManager = new DynamicManager();
        var dmManager = this.dmManager;
        var page = this;
        var scene = viewer.scene;
        dmManager.addToViewer(viewer)
        var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
        handler.setInputAction(function (movement) {
            var pick = scene.pick(movement.position);
            if (Cesium.defined(pick)) {
                //将modelInstance转为Dm，
                var dm = page.judgeModelInstanceToDm(pick);
                var currentDm = dmManager.currentDynamicModel;
                if (dm) { //为DM目标
                    if (currentDm && dm.id === currentDm.id) { //取消点选
                        dmManager.currentDynamicModel = undefined;
                        page.drawer = false;
                    } else if (!currentDm || dm.id !== currentDm.id) { //切换 移除并恢复之前的//或者选取的第一次
                        if (currentDm) {
                            //去除之前可能存在的痕迹
                            dmManager.clearCurrPathLine();
                        }
                        dmManager.currentDynamicModel = dm;
                        page.drawer = true;
                        page.name = dm.id;
                        // page.position = page.positionToDegrees(dm.getPosition());
                    }
                }
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        page.showCurrentPosition();
    },
    methods: {
        async createMbs() {
            var files = await this.statisticFile();
            var flightName = files[0];
            var flightData = await this.dealFilghtData(flightName);
            var matrixArray = [];
            var idArray = [];
            for (let i = 0; i < flightData.length; i++) {
                let modelInfor = flightData[i];
                let modelCode = modelInfor["code"];
                let modelArray = modelInfor["infor"];
                let name = modelArray[0];
                let lng = modelArray[2];
                let lat = modelArray[1];
                let heading = modelArray[3];
                let alt = modelArray[4];
                let cartesian = Cesium.Cartesian3.fromDegrees(lng, lat, alt);
                let modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(cartesian);
                matrixArray.push(modelMatrix);
                idArray.push(modelCode);
            };
            var page = this;
            var dmManager = this.dmManager;
            var options = {
                name: "plane",
                modelMatrixArray: matrixArray,
                idNewArray: idArray
            }
            dmManager.addSameNameDynamicModels(options);
        },
        async setTrail(modelCode) {
            var trail = await this.readTrailFile(modelCode);
            if (trail === undefined) {
                trail = trailTest;
            }
            trail = trail.trail;
            var modelTrail = []
            for (let j = 0; j < trail.length; j++) {
                let temp = trail[j]
                modelTrail.push({
                    "lat": temp.lat,
                    "lng": temp.lng,
                    "alt": temp.alt,
                    "ts": temp.ts
                })
            }
            return modelTrail;
        },
        async trueTimeUpdate() {
            var page = this;
            var modelInfor, modelCode, modelArray, lng, lat, heading, alt, model, cartesian, j, length, modelMatrix, hpr;
            var files = await this.statisticFile();
            var fileNum = 1;
            var interval = setInterval(async function () {
                if (fileNum >= files.length - 1) {
                    clearInterval(interval);
                }
                var flightName = files[fileNum];
                var flightData = await page.dealFilghtData(flightName);
                var trueTimeMap = new Map();
                for (let i = 0; i < flightData.length; i++) {
                    modelInfor = flightData[i];
                    modelCode = modelInfor["code"];
                    modelArray = modelInfor["infor"];
                    name = modelArray[0];
                    lng = modelArray[2];
                    lat = modelArray[1];
                    heading = modelArray[3];
                    alt = modelArray[4];
                    cartesian = Cesium.Cartesian3.fromDegrees(lng, lat, alt);
                    heading = Cesium.Math.toRadians(heading);
                    hpr = new Cesium.HeadingPitchRoll(heading, 0, 0);
                    modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(cartesian, hpr);
                    trueTimeMap.set(modelCode, modelMatrix)
                }
                if (fileNum === 1) {
                    page.dmManager.initTrueTime();
                }
                page.dmManager.trueTimeUpdate(trueTimeMap)
                // page.dmManager.matrixMap = trueTimeMap;
                fileNum++;
            }, 1500);
            return interval;
        },
        readTrailFile(trailCode) {
            var trailAddress = this.basePath + "trail/trail_" + trailCode + ".json";
            return fetch(trailAddress).then(res => {
                if (res.status === 200) {
                    return res.json();
                }
            })
        },
        dealFilghtData(flightName) {
            flightName = this.basePath + "flight/" + flightName;
            return fetch(flightName).then(res => res.json()).then(json => {
                var data = []
                var otherInfor = ["full_count", "version", "stats", "selected-aircraft", "selected"];
                for (let key in json) {
                    if (!otherInfor.includes(key)) {
                        data.push({
                            "code": key,
                            "infor": json[key]
                        });
                    }
                }
                return data;
            });
        },
        //TODO 一开始加载level为model，清除会出错
        deleteMbs() {
            if (this.interval !== "") {
                clearInterval(this.interval);
            }
            this.dmManager.clearAllMbs();
        },
        pathChoose() {
            this.dmManager.clearCurrPathLine()
            if (this.pathChooseValue === "passed") {
                this.dmManager.setCurrPath("passed");
            } else if (this.pathChooseValue === "path") {
                this.dmManager.setCurrPath("path");
            }
        },
        statisticFile() {
            var fileName = this.basePath + "flightInfor.json";
            return fetch(fileName).then(res => res.json()).then(json => {
                return json.data;
            });
        },
        trackModel() {
            var dmManager = this.dmManager;
            var dm = dmManager.currentDynamicModel;
            if (!this.cameraPick) {
                dmManager.clock.onTick.addEventListener(this.cameraFunction)
            } else {
                dmManager.clock.onTick.removeEventListener(this.cameraFunction);
            }
            this.cameraPick = !this.cameraPick;
        },
        cameraFunction() {
            var dmManager = this.dmManager;
            var dm = dmManager.currentDynamicModel;
            var position = dm.getPosition();
            var or = dm.getOrientation();
            var viewer = dmManager.viewer;
            viewer.camera.setView({
                destination: position,
                orientation: {
                    heading: Cesium.HeadingPitchRoll.fromQuaternion(or).heading, // east, default value is 0.0 (north)
                    pitch: Cesium.Math.toRadians(-90),
                    roll: 0
                }
            });
            viewer.camera.moveBackward(100000);
        },
        formatTooltip(val) {
            var time = new Date(val)
            return time;
        },
        //TODO
        judgeModelInstanceToDm(pick) {
            for (let value of this.dmManager.idMap.values()) {
                if (pick instanceof Cesium.ModelInstance) {
                    if (value.modelInstance.instanceId === pick.instanceId ) {
                        if(value.collection._center.equals(pick.primitive._center)){
                                    return value;
                        }
                    }
                } else {
                    if (pick.id === value.id) {
                        return value;
                    }
                }
            }
        },
        positionToDegrees(position) {
            var cartographic = Cesium.Cartographic.fromCartesian(position);
            var lat = Cesium.Math.toDegrees(cartographic.latitude);
            var alt = Cesium.Math.toDegrees(cartographic.height);
            var lng = Cesium.Math.toDegrees(cartographic.longitude);
            return [lng, lat, alt];
        },
        closeDrawer() {
            //  this.dmMamager.currentDynamicModel = undefined;
            //清空工作；
        },
        changeTime(val) {
            if (val) {
                this.dmManager.clock.currentTime = Cesium.JulianDate.fromDate(new Date(val));
                if (this.dmManager.currentDynamicModel.path !== "path") {
                    this.dmManager.clearCurrPathLine();
                    this.dmManager.setCurrPath("passed");
                }
            }
        },
        showCurrentPosition() {
            var interval = setInterval(() => {
                if (this.dmManager.currentDynamicModel) {
                    this.position = this.positionToDegrees(this.dmManager.currentDynamicModel.getPosition());
                }
            }, 500);
        },
        editMb() {
            var hpr = Cesium.HeadingPitchRoll.fromDegrees(45, 0, 0);
            var scale = 5;
            this.dmManager.editCurrMb(hpr, scale);
        },
        changeMb(){
            this.dmManager.changeCurrMb("balloon");
        }
    },
    watch: {
        time: function (newValue, oldValue) {

        },
        intervalSwitch: function (newValue, oldValue) {
            var page = this;
            if (newValue) {
                page.trueTimeUpdate().then(res => {
                    page.interval = res;
                })
            } else {
                clearInterval(this.interval);
                this.interval = "";
            }
        },
        history: function (newValue, oldValue) {
            var page = this;
            var dmManager = this.dmManager;
            var viewer = dmManager.viewer;
            var currentDm = dmManager.currentDynamicModel;
            if (!newValue) {
                //stop     
                this.activeNames = ['1']
                dmManager.dataDrive = undefined;
            } else { //history
                this.intervalSwitch = false;
                if (currentDm.trail.length === 0) { //模型第一次点击
                    var trail = page.setTrail(currentDm.id);
                    trail.then(data => {
                        dmManager.initHistory(data);
                        page.minTime = Cesium.JulianDate.toDate(dmManager.clock.startTime).getTime();
                        page.maxTime = Cesium.JulianDate.toDate(dmManager.clock.stopTime).getTime();
                        page.time = Cesium.JulianDate.toDate(dmManager.clock.startTime).getTime();
                    })
                } else { //无需获取数据
                    dmManager.initHistory();
                    page.minTime = Cesium.JulianDate.toDate(dmManager.clock.startTime).getTime();
                    page.maxTime = Cesium.JulianDate.toDate(dmManager.clock.stopTime).getTime();
                    page.time = Cesium.JulianDate.toDate(dmManager.clock.startTime).getTime();
                }
                dmManager.viewer.camera.flyTo({
                    destination: dmManager.currentDynamicModel.getPosition()
                });
            }

        },
        multipiler: function (newValue, oldValue) {
            this.dmManager.setClockMultipiler(newValue)
        }
    }
}
</script>

<style>
@import "cesium/Source/Widgets/widgets.css";

#cesiumContainer {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
}

#editor {
    position: absolute;
    top: 10;
    right: 0;
    width: 250px;
    z-index: 1100;
    font-size: 14px;
}

.operater {
    height: 30px;
    width: 100%;
    margin-top: 10px;
    margin-left: 10px;
    color: #409EFF;
    display: flex;
    flex-direction: row;
    align-items: center;
}

.slider {
    width: 60%;
    margin-left: 20px;
}

.drawer {
    width: 200px !important;
    height: 100%;
    background-color: #f3f4f7;
    opacity: 0.8;
}

.el-drawer__wrapper {
    width: 200px;
}

.modelName {
    font-size: 20px;
    color: black;
    width: 100%;
    height: 30px;
}

.modelImage {
    width: 100%;
    height: 60px;
}

.attributeBar {
    font-size: 13px;
    color: black;
    width: 100%;
    height: 30px;
    margin-top: 30px;
}

.el-collapse-item__header {
    padding-left: 20px;
}

.el-collapse-item__wrap {
    padding-left: 20px;
}
</style>
