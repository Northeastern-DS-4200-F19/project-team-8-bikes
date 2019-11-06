/* before document loads */
// converts to lowercase & replaces spaces with '-'
const formatStreetName = street => street.toLowerCase().replace(/\s/g, '-');

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
                y: j>0 ? Number(bikeLanes[j-1].y) + Number(bikeLanes[j-1].percent) : 0,
            })
        });
        newData.push(bikeLanes);
    });

    return newData;
}

/* document loaded */
$(function() {
    d3.csv("data/Street Segment Bike Lanes.csv").then(renderChart);

    function renderChart(data) {
        let streets = data.map(d => d.location);
        let headers = Object.keys(data[0]);
        let bikeLaneTypes = headers.slice(2, 10);
        let lanes = formatData(data, bikeLaneTypes);
        console.log(lanes);

        // sources:
        //https://bl.ocks.org/KingOfCramers/04dcd9742a2be13d99db5f7a7480b4ca
        //http://bl.ocks.org/mstanaland/6100713
        let svg = d3.select("#vis-svg")
                .attr("width", 550)
                .attr("height", 500);

        let xScale = d3.scaleLinear()
            .domain([0, data.length])
            .range([20, 480]);

        // yScale is not inverted on the yScale
        let yScale = d3.scaleLinear()
            .domain([0, 100])
            .range([480,20]);

        // heightscale where the y is inverted
        let heightScale = d3.scaleLinear()
            .domain([0, 100])
            .range([0, 460]);

        let colorScale = ["#fcd88a", "#cf7c1c", "#93c464", "#75734F", "#5eafc6", "#41a368", "#41a000", "#41eae4"];

        let yAxis = d3.axisLeft()
            .scale(yScale)
            .tickSize(-500);

        let xAxis = d3.axisBottom()
            .scale(xScale)
            .tickFormat((d) => console.log(data[d]));

        svg.append("g")
            .attr("class", "yAxis")
            .call(yAxis)
            .attr("transform",`translate(${20}, 0)`);

        svg.append("g")
            .attr("class", "xAxis")
            .call(xAxis)
            .attr("transform",`translate(0, ${480})`);

        d3.select("g.xAxis").selectAll("g.tick").selectAll("text");

        d3.select("g.xAxis").selectAll("g.tick").selectAll("line");

        // Create groups for each series, rects for each segment
        let groups = svg.selectAll("g.bars")
            .data(lanes)
            .enter()
                .append("g")
                .attr("class", d => `bars street-${formatStreetName(d[0].location)}`);

        // create bar rectangles
        let rect = groups.selectAll("rect")
            .data(d => d)
            .enter()
                .append("rect")
                    .attr("x", d => xScale(d.x+1)-10)
                    .attr("y", d => yScale(d.y)-heightScale(d.percent))
                    .attr("height", d => heightScale(d.percent))
                    .attr("width", () => 25)
                    .attr("class", d => `street-${formatStreetName(d.location)} lane-${d.type}`)
                    .style("fill", (d, i) => colorScale[i])
                    // for adding tooltips
                    /*
                    .on("mouseover", () => tooltip.style("display", null))
                    .on("mouseout", () => tooltip.style("display", "none"))
                    .on("mousemove", d => {
                        var xPosition = d3.mouse(this)[0] - 15;
                        var yPosition = d3.mouse(this)[1] - 25;
                        tooltip.attr("transform", "translate(" + xPosition + "," + yPosition + ")");
                        tooltip.select("text").text(d.y);
                    })*/;
    }
});


