var viewer = new Cesium.Viewer("cesiumContainer", {
    shouldAnimate: true,
});
var scene = viewer.scene;
var context = scene.context;
var camera = viewer.camera;
scene.debugShowFramesPerSecond = true;

var instancedArraysExtension = context._instancedArrays;
var count = 1024;
var spacing = 0.0002;
var url = "../../SampleData/models/CesiumAir/Cesium_Air.glb";
var useCollection = true;

var centerLongitude = -75.61209431;
var centerLatitude = 40.042530612;
var height = 50.0;

function orientCamera(center, radius) {
    var range = Math.max(radius, camera.frustum.near) * 2.0;
    var heading = Cesium.Math.toRadians(230.0);
    var pitch = Cesium.Math.toRadians(-20.0);
    camera.lookAt(
        center,
        new Cesium.HeadingPitchRange(heading, pitch, range)
    );
    camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
}

function createCollection(instances, value) {
    var collection = scene.primitives.add(
        new Cesium.ModelInstanceCollection({
            url: url,
            instances: instances,
        })
    );

    collection.readyPromise
        .then(function(collection) {
            // Play and loop all animations at half-speed
            collection.activeAnimations.addAll({
                multiplier: 0.5,
                loop: Cesium.ModelAnimationLoop.REPEAT,
            });
            orientCamera(
                collection._boundingSphere.center,
                collection._boundingSphere.radius
            );
            if (value === 1) {
                editModel(collection)
            }
        })
        .otherwise(function(error) {
            window.alert(error);
        });
}

function createModels(instances) {
    var points = [];
    var model;

    var length = instances.length;
    for (var i = 0; i < length; ++i) {
        var instance = instances[i];
        var modelMatrix = instance.modelMatrix;
        var translation = new Cesium.Cartesian3();
        Cesium.Matrix4.getTranslation(modelMatrix, translation);
        points.push(translation);

        model = scene.primitives.add(
            Cesium.Model.fromGltf({
                url: url,
                modelMatrix: modelMatrix,
            })
        );

        model.readyPromise
            .then(function(model) {
                // Play and loop all animations at half-speed
                model.activeAnimations.addAll({
                    multiplier: 0.5,
                    loop: Cesium.ModelAnimationLoop.REPEAT,
                });
            })
            .otherwise(function(error) {
                window.alert(error);
            });
    }

    model.readyPromise.then(function(model) {
        var boundingSphere = new Cesium.BoundingSphere();
        Cesium.BoundingSphere.fromPoints(points, boundingSphere);
        orientCamera(
            boundingSphere.center,
            boundingSphere.radius + model.boundingSphere.radius
        );
    });
}

function reset(value) {
    scene.primitives.removeAll();
    var instances = [];
    var gridSize = Math.sqrt(count);
    for (var y = 0; y < gridSize; ++y) {
        for (var x = 0; x < gridSize; ++x) {
            var longitude = centerLongitude + spacing * (x - gridSize / 2);
            var latitude = centerLatitude + spacing * (y - gridSize / 2);
            var position = Cesium.Cartesian3.fromDegrees(
                longitude,
                latitude,
                height
            );
            var heading = Math.random();
            var pitch = Math.random();
            var roll = Math.random();
            var scale = (Math.random() + 1.0) / 2.0;

            var modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(
                position,
                new Cesium.HeadingPitchRoll(heading, pitch, roll)
            );
            Cesium.Matrix4.multiplyByUniformScale(
                modelMatrix,
                scale,
                modelMatrix
            );

            instances.push({
                modelMatrix: modelMatrix,
            });
        }
    }

    if (useCollection) {
        createCollection(instances, value);
    } else {
        createModels(instances);
    }
}

// Scale picked instances
var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
handler.setInputAction(function(movement) {
    var pickedInstance = scene.pick(movement.position);
    if (Cesium.defined(pickedInstance)) {
        console.log(pickedInstance);
        var instance = useCollection ?
            pickedInstance :
            pickedInstance.primitive;
        var scaleMatrix = Cesium.Matrix4.fromUniformScale(1.1);
        var modelMatrix = Cesium.Matrix4.multiply(
            instance.modelMatrix,
            scaleMatrix,
            new Cesium.Matrix4()
        );
        instance.modelMatrix = modelMatrix;
    }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

Sandcastle.addToolbarMenu([{
        text: "1024 instances",
        onselect: function() {
            count = 1024;
            reset(2);
        },
    },
    {
        text: "100 instances",
        onselect: function() {
            count = 100;
            reset(2);
        },
    },
    {
        text: "25 instances",
        onselect: function() {
            count = 25;
            reset(2);
        },
    },
    {
        text: "4 instances",
        onselect: function() {
            count = 4;
            reset(1);
        },
    },
    {
        text: "10000 instances",
        onselect: function() {
            count = 10000;
            reset(1);
        },
    }, {
        text: "0000 instances",
        onselect: function() {
            count = 100000;
            reset(1);
        },
    },
]);

function editModel(collection) {
    collection._state = 0;
    var gridSize = Math.sqrt(count);
    var scaleMatrix = Cesium.Matrix4.fromUniformScale(10);
    var longitude = centerLongitude + spacing * (gridSize / 2 + 0.1);
    var latitude = centerLatitude + spacing * (gridSize / 2 + 0.1);
    var height = centerLatitude + spacing * (gridSize / 2 + 0.1);
    var position = new Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
    var modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(
        position,
        new Cesium.HeadingPitchRoll(0, 0, 0)
    );
    modelMatrix = Cesium.Matrix4.multiply(
        modelMatrix,
        scaleMatrix,
        new Cesium.Matrix4()
    );
    collection._instances.push(new Cesium.ModelInstance(collection, modelMatrix, count));
}

Sandcastle.addToolbarMenu([{
        text: "Aircraft",
        onselect: function() {
            url = "../../SampleData/models/CesiumAir/Cesium_Air.glb";
            spacing = 0.0002;
            reset();
        },
    },
    {
        text: "Ground Vehicle",
        onselect: function() {
            url = "../../SampleData/models/GroundVehicle/GroundVehicle.glb";
            spacing = 0.00008;
            reset();
        },
    },
    {
        text: "Milk Truck",
        onselect: function() {
            url =
                "../../SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb";
            spacing = 0.00008;
            reset();
        },
    },
    {
        text: "Skinned Character",
        onselect: function() {
            url = "../../SampleData/models/CesiumMan/Cesium_Man.glb";
            spacing = 0.00001;
            reset();
        },
    },
]);

Sandcastle.addToolbarMenu([{
        text: "Instancing Enabled",
        onselect: function() {
            context._instancedArrays = instancedArraysExtension;
            useCollection = true;
            reset();
        },
    },
    {
        text: "Instancing Disabled",
        onselect: function() {
            context._instancedArrays = undefined;
            useCollection = true;
            reset();
        },
    },
    {
        text: "Individual models",
        onselect: function() {
            useCollection = false;
            reset();
        },
    },
]);

Sandcastle.addToolbarButton("2D", function() {
    scene.morphTo2D(0.0);
});

Sandcastle.addToolbarButton("CV", function() {
    scene.morphToColumbusView(0.0);
});

Sandcastle.addToolbarButton("3D", function() {
    scene.morphTo3D(0.0);
});