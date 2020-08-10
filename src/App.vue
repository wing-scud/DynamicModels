<template>
<div id="app">
    <!-- <HelloWorld></HelloWorld> -->
    <!-- <ModelPage></ModelPage> -->
    <DmManagerPage></DmManagerPage>
</div>
</template>

<script>
// import HelloWorld from "./components/HelloWorld"
// import ModelPage from "./components/ModelPage"
import DmManagerPage from "./components/DmManagerPage"
export default {
    name: 'App',
    components: {
        // HelloWorld,
        // ModelPage,
        DmManagerPage
    }
}
</script>

<style>
body,#app {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
}
</style>
