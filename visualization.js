/* before document loads */


/* document loaded */
$(function() {
    d3.csv("data/Street Segment Bike Lanes.csv").then(renderChart);

    // create one data object for each bike lane type on each street
    function formatData(data, bikeLaneTypes) {
        let newData = [];

        data.forEach((d, i) => {
            let bikeLanes = [];
            bikeLaneTypes.forEach((bl, j) => {
                bikeLanes.push({
                    location: d["Location"],
                    neighborhood: d["Neighborhood"],
                    type: bl,
                    segments: d["Segments"],
                    percent: d[bl],
                    x: i,
                    y: j,
                })
            });
            newData.push(bikeLanes);
            /*
            bikeLaneTypes.forEach((bl, i) => {
                newData.push({
                    location: d["Location"],
                    neighborhood: d["Neighborhood"],
                    type: bl,
                    segments: d["Segments"],
                    percent: d[bl],
                    y: i,
                });
            });*/
        });

        return newData;
    }

    function renderChart(data) {
        let streets = data.map(d => d.location);
        let headers = Object.keys(data[0]);
        let bikeLaneTypes = headers.slice(2, 10);
        let lanes = formatData(data, bikeLaneTypes);
        console.log(lanes);

        // sources:
        //https://bl.ocks.org/KingOfCramers/04dcd9742a2be13d99db5f7a7480b4ca
        //http://bl.ocks.org/mstanaland/6100713
        let svg = d3.select("body")
            .append("svg")
                .attr("width", 550)
                .attr("height", 500);

        let xScale = d3.scaleLinear()
            .domain([0, data.length-1])
            .range([20, 480]);

        // Notice that the yScale is not inverted on the yScale
        let yScale = d3.scaleLinear()
            .domain([0, 100])
            .range([480, 20]);

        // We create a heightscale where the y is inverted!
        let heightScale = d3.scaleLinear()
            .domain([0, 100])
            .range([20, 480]);

        let colorScale = ["#fcd88a", "#cf7c1c", "#93c464", "#75734F", "#5eafc6", "#41a368", "#41a368", "#41a368"];

        let yAxis = d3.axisLeft()
            .scale(yScale)
            .tickSize(-500);

        svg.append("g")
            .attr("class", "yAxis")
            .call(yAxis)
            .attr("transform",`translate(${20}, 0)`);

        let xAxis = d3.axisBottom()
            .scale(xScale)
                .tickSize(-500);

        svg.append("g")
            .attr("class", "xAxis")
            .call(xAxis)
            .attr("transform",`translate(0, ${480})`);

        d3.select("g.xAxis").selectAll("g.tick").selectAll("text");

        d3.select("g.xAxis").selectAll("g.tick").selectAll("line");

        let stackLayout = d3.stack()
            .keys(streets);

        // Create groups for each series, rects for each segment
        let groups = svg.selectAll("g.bars")
            .data(lanes)
            .enter()
                .append("g")
                .attr("class", "bars")

        // create bar rectangles
        let rect = groups.selectAll("rect")
            .data(d => d)
            .enter()
                .append("rect")
                    .attr("x", (d, i) => xScale(d.x+1)-10)
                    .attr("y", (d, i) => yScale(d.percent - d.y))
                    .attr("height", d => yScale(d.percent))
                    .attr("width", () => 25)
                    .attr("class",
                            d => `street-${d.location.toLowerCase().replace(/\s/g, '-')}`)
                    .style("fill", (d, i) => colorScale[i]);
            // for adding tooltips
            /*.on("mouseover", () => tooltip.style("display", null))
                .on("mouseout", () => tooltip.style("display", "none"))
                .on("mousemove", d => {
                    var xPosition = d3.mouse(this)[0] - 15;
                    var yPosition = d3.mouse(this)[1] - 25;
                    tooltip.attr("transform", "translate(" + xPosition + "," + yPosition + ")");
                    tooltip.select("text").text(d.y);
            })*/;
    }
});


