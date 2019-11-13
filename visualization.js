/* before document loads */
// converts to lowercase & replaces spaces with '-'
const formatStreetName = street => street.toLowerCase().replace(/\s/g, '-');

const laneTypeNames = {
    BL: "Bike Lane",
    BFBL: "Buffered Bike Lane",
    SBL: "Separated bike lane",
    SLM: "Shared lane markings",
    PSL: "Priority shared lane markings",
    CL: "Climbing lane/hybrid",
    BSBL: "Bus/bike lane",
    SBLBL: "Separated bike lane on one side, bike lane on the opposite side",
};

//const asNumber = item => item==="n/a" ? 0 : Number(item);

const removeSection = streetName => {
    let temp = streetName.split(" ");
    return temp.slice(0, temp.indexOf("of")-1).join(" ");
};

// create one data object for each bike lane type on each street
function formatBikeLaneData(data, bikeLaneTypes) {
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

function formatAccidentData(data) {

}

function formatTrafficData(data, times) {
    let newData = {
        bike: [],
        mv: []
    };

    data.filter(item => item["Direction"] === "Total")
        .forEach(street => {
            times.forEach(time => {
                let list = street["Vehicle Type"]==="Bike" ? newData.bike : newData.mv;
                list.push({
                    time: d3.timeParse("%I %p")(time),
                    quantity: street[time],
                    location: street["Location"],
                    type: street["Vehicle Type"],
                    street: removeSection(street["Location"])
                });
            });
        });

    return newData;
}

function totalTraffic(streets, times) {
    let timeTotals = {};
    let keys;
    times.forEach((time, i) => timeTotals[i] = 0);

    streets.forEach(street =>
        timeTotals[street.time.getHours()] += Number(street.quantity)
    );
    keys = Object.keys(timeTotals);

    return keys.map(key => ({
        time: d3.timeParse("%H")(key),
        quantity: timeTotals[key],
    }))
}

function hoverText(data, bikeLaneTypeNames) {
    let blType = "Bike Lane Type: " + bikeLaneTypeNames[data.type];
    //TODO add segments
    //let stSegments = "Street Segments: ";
    return blType;
}

/* document loaded */
$(function() {
    let filterStreet = null;
    let bikeLaneData, accidentData, trafficData;

    d3.csv("data/Street Segment Bike Lanes.csv")
        .then((bikeLanes) => d3.csv("data/Accidents Bike Lanes.csv")
            .then((accidents) => renderBarChart(bikeLanes, accidents)));
    d3.csv("data/BikeMVCounts.csv").then(renderLineChart);

    function renderBarChart(bikeLanes, accidents) {
        let streets = bikeLanes.map(d => d.location);
        let headers = Object.keys(bikeLanes[0]);
        let bikeLaneTypes = headers.slice(2, 10);
        let lanes = formatBikeLaneData(bikeLanes, bikeLaneTypes);
        bikeLaneData = formatBikeLaneData(bikeLanes, bikeLaneTypes);
        accidentData = formatAccidentData(accidents);

        let margin = {
                top: 20,
                right: 20,
                bottom: 40,
                left: 40
            },
            width = 600,
            height = 480,
            totalHeight = height + margin.top + margin.bottom,
            totalWidth = width + margin.left + margin.right;

        let svg = d3.select("#vis-svg")
                .attr("width", totalWidth)
                .attr("height", totalHeight)
                .attr("width", width)
                .attr("height", height)
        .append("g")
            .attr("transform",
                `translate(${margin.left},${margin.top})`);

        let xScale = d3.scaleLinear()
            .domain([0, bikeLanes.length])
            .range([margin.left, width + margin.left]);

        // yScale is not inverted on the yScale
        let yScale = d3.scaleLinear()
            .domain([0, 100])
            .range([height + margin.top, margin.top]);

        // heightscale where the y is inverted
        let heightScale = d3.scaleLinear()
            .domain([0, 100])
            .range([0, height]);

        // colors for bike lane types
        let colorScale = ["#fcd88a", "#cf7c1c", "#93c464", "#75734F", "#5eafc6", "#41a368", "#41a000", "#41eae4"];

        //y axis with labels
        let yAxis = d3.axisLeft()
            .scale(yScale)
            .tickSize(-width);

        //x axis with labels
        let xAxis = d3.axisBottom()
            .scale(xScale)
            .tickFormat((d) => d.location);

        //add x and y axes to the svg
        svg.append("g")
            .attr("class", "yAxis")
            .call(yAxis)
            .attr("transform",`translate(${margin.left}, 0)`);

        svg.append("g")
            .attr("class", "xAxis")
            .call(xAxis)
            .attr("transform",`translate(0, ${totalHeight - margin.bottom})`);

        d3.select("g.xAxis").selectAll("g.tick").selectAll("text");

        d3.select("g.xAxis").selectAll("g.tick").selectAll("line");

        // Create groups for each series, rects for each segment
        let groups = svg.selectAll("g.bars")
            .data(lanes)
            .enter()
                .append("g")
                .attr("class", d => `bars street-${formatStreetName(d[0].location)}`);

        let tooltip = d3.select("body")
            .append("div")
            .style("position", 'absolute')
            .style("z-index", "10")
            .style("visibility", "hidden")
            .style("background", "#eee")
            .text("a simple tooltip");

        // create bar rectangles
        groups.selectAll("rect")
            .data(d => d)
            .enter()
                .append("rect")
                    .attr("x", d => xScale(d.x+1)-10)
                    .attr("y", d => yScale(d.y)-heightScale(d.percent))
                    .attr("height", d => heightScale(d.percent))
                    .attr("width", () => 25)
                    .attr("class", d => `street-${formatStreetName(d.location)} lane-${d.type}`)
                    .style("fill", (d, i) => colorScale[i])
                    .on("mouseover", (d, i, nodes) => {
                        filterStreet = d.location;
                        updateLineChart();
                        d3.select(nodes[i]).style("border", "1px solid #000");
                        tooltip.text(hoverText(d, laneTypeNames));
                        return tooltip.style("visibility", "visible");
                    })
                    .on("mousemove", () =>
                        tooltip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px")
                    )
                    .on("mouseout", (d, i, data) => {
                        tooltip.style("visibility", "hidden");
                        filterStreet = null;
                        updateLineChart();
                    });

        // text label for the x axis
        svg.append("text")             
        .attr("transform",`translate(${width/2},${height + margin.top + 20})`)
        .style("text-anchor", "middle")
        .text("Streets");

        // text label for the y axis
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left)
            .attr("x",0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Percentage of Street");

        // Add a title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .style("font-size", "24px")
            .style("text-decoration", "underline")
            .text("Bike Lanes for Boston Streets");

        //Create Legend
        // code referenced from https://bl.ocks.org/dianaow/0da76b59a7dffe24abcfa55d5b9e163e

        // create g for legend to go into
        let radius = 6;
        let svgLegend = svg.append('g')
                    .attr('class', 'gLegend')
                    .attr("transform", `translate(${width + margin.left + 30},0)`);

        // place legend on svg
        let legend = svgLegend.selectAll('.legend')
               .data(bikeLaneTypes)
               .enter().append('g')
                 .attr("class", "legend")
                 .attr("transform", (d, i) => `translate(0,${i*20})`);

        // add color circles to legend
        legend.append("circle")
            .attr("class", "legend-node")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", radius)
            .style("fill", (d, i) => colorScale[i]);

        // add text to legend
        legend.append("text")
            .attr("class", "legend-text")
            .attr("x", radius*2)
            .attr("y", radius/2)
            .style("fill", "#272727")
            .style("font-size", 12)
            .text(d=>laneTypeNames[d]);
    }

    function renderLineChart(data) {
        let margin = {
                top: 60,
                right: 20,
                bottom: 80,
                left: 80
            },
            width = 590 - margin.left - margin.right,
            height = 405 - margin.top - margin.bottom;
        let parseTime = d3.timeParse("%I %p");
        let times = Object.keys(data[0]).filter(key => parseTime(key) != null);
        trafficData = formatTrafficData(data, times);
        let traffic = formatTrafficData(data, times);

        // set the ranges
        let x = d3.scaleTime()
            .domain(d3.extent(traffic.bike.map(d => d.time)))
            .range([0, width]);
        let y = d3.scaleLinear()
            .domain([0, d3.max(totalTraffic(traffic.mv, times), d => d.quantity)])
            .range([height, 0]);

        // define the line
        let valueLine = d3.line()
            .x(d => (x(d.time)))
            .y(d => (y(d.quantity)));

        // append the svg object to the body of the page
        // appends a 'group' element to 'svg'
        // moves the 'group' element to the top left margin
        let group = d3.select(".vis-holder")
            .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .attr("class", "line-chart")
                .append("g")
                    .attr("transform",`translate(${margin.left},${margin.top})`);

        // Add the valueLine path for bikes
        group.append("path")
            .data([totalTraffic(traffic.bike, times)])
            .attr("class", "line bike")
            .attr("d", valueLine)
            .attr("fill", "none")
            .attr("data-legend", d => d.type)
            .attr("stroke", "#b35a2d");

        // Add the valueLine path for motor vehicles
        group.append("path")
            .data([totalTraffic(traffic.mv, times)])
            .attr("class", "line mv")
            .attr("d", valueLine)
            .attr("fill", "none")
            .attr("data-legend", () => "Motor Vehicles")
            .attr("stroke", "#346d94");

        // Add the X Axis
        group.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        // Add the Y Axis
        group.append("g")
            .attr("class", "x-axis")
            .call(d3.axisLeft(y));

        // text label for the x axis
        group.append("text")             
        .attr("transform",`translate(${width/2},${height + margin.top + 20})`)
        .style("text-anchor", "middle")
        .style("font-size", "13px")
        .text("Time of Day");

        // text label for the y axis
        group.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x",0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .style("font-size", "13px")
            .text("Traffic Level");

        // Add a title
        group.append("text")
            .attr("x", (width / 2))
            .attr("y", 0 - (margin.top / 2))
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("text-decoration", "underline")
            .text("Car and Bike Traffic Levels");
    }

    function updateLineChart() {
        let svg = d3.select(".line-chart");
        let group = svg.select("g");
        let filteredData = {};
        Object.keys(trafficData)
            .forEach(type => filteredData[type] = trafficData[type]
                .filter(traffic => filterStreet===null || traffic.street===filterStreet));
        let times = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
        let height = svg.attr("height");
        let width = svg.attr("width");
        let x = d3.scaleTime()
            .domain(d3.extent(times.map(d => d3.timeParse("%H")(d))))
            .range([0, width-100]); //TODO fix scale range
        let y = d3.scaleLinear()
            .domain([0, d3.max(totalTraffic(filteredData.mv, times), d => d.quantity)])
            .range([height-150, 0]); //TODO fix scale range
        let valueLine = d3.line()
            .x(d => (x(d.time)))
            .y(d => (y(d.quantity)));

        let bikeLine = group.select(".line.bike")
            .data([totalTraffic(filteredData.bike, times)])
            .transition()
                .duration(300)
                .ease(d3.easeLinear)
            .attr("d", valueLine);
        let mvLine = group.select(".line.mv")
            .data([totalTraffic(filteredData.mv, times)])
            .transition()
                .duration(300)
                .ease(d3.easeLinear)
            .attr("d", valueLine);
    }
});


