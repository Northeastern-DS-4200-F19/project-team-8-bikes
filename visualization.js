/* before document loads */
// converts to lowercase & replaces spaces with '-'
const formatStreetNameAsClass = street => street.toLowerCase().replace(/\s/g, '-');

const laneTypeNames = {
    BL: "Bike Lane",
    BFBL: "Buffered Bike Lane",
    SBL: "Separated Bike Lane",
    SLM: "Shared Lane",
    PSL: "Priority Shared Lane",
    CL: "Climbing Lane/Hybrid",
    BSBL: "Bus/Bike Lane",
    SBLBL: "Shared Bike Lane/Bike Lane",
};

let legendHoverText = {
    "Bike Lane": "An exclusive lane for bicycle travel.",
    "Buffered Bike Lane": "An exclusive lane for bicycle travel with a striped buffer " +
        "zone adjacent to a vehicle travel lane or parking lane.",
    "Separated Bike Lane": "An exclusive lane for bicycle travel that is physically separated from motor vehicle traffic via flexposts, on-street parking, and/or raised curbs.",
    "Shared Lane": "A lane with shared lane markings indicating that bicycles and motor vehicles must share a travel lane.",
    "Priority Shared Lane": "A lane with shared lane markings that are supplemented with dashed longitudinal lines and/or colored pavement to indicate bicycle priority.",
    "Climbing Lane/Hybrid": "A two-way street with a bike lane in one direction and a shared lane in the opposite direction.",
    "Bus/Bike Lane": "A lane for shared bus and bicycle travel. Motor vehicles are prohibited except where signed.",
    "Shared Bike Lane/BikeLane": "A street designed for slow speeds with a single surface shared by all users.",
};

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

// formats the data so that numbers are parsed a numbers
function formatCrashData(data) {
    let bikeLaneTypes = Object.keys(laneTypeNames);
    let newData = [];

    data.forEach((d, i) => {
        let bikeLanes = [];
        bikeLaneTypes.forEach((bl, j) =>
            bikeLanes.push({
                location: d["Location"],
                neighborhood: d["Neighborhood"],
                type: bl,
                segments: d["Segments"],
                crashes: Number(d[bl]),
                streetTotal: Number(d["Total"]),
                x: i,
                y: j>0 ? Number(bikeLanes[j-1].y) + bikeLanes[j-1].crashes : 0,
            })
        );
        newData.push(bikeLanes);
    });

    return newData;
}

// splits traffic data into car and bike
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
                    quantity: Number(street[time]),
                    location: street["Location"],
                    type: street["Vehicle Type"],
                    street: removeSection(street["Location"])
                });
            });
        });

    return newData;
}

// returns a list of objects with the keys "time" and "quantity" where the index represents an hour of the day
function averageTraffic(streets, times) {
    let timeTotals = {};
    let streetCount = {};
    let keys;
    times.forEach((time, i) => {
        timeTotals[i] = 0;
        streetCount[i] = 0;
    });

    streets.forEach(street => {
        timeTotals[street.time.getHours()] += street.quantity;
        streetCount[street.time.getHours()]++;
    });
    keys = Object.keys(timeTotals);

    return keys.map(key => ({
        time: d3.timeParse("%H")(key),
        quantity: timeTotals[key]/streetCount[key],
    }));
}

// returns the maximum of the provided list of objects with the key "quantity"
function maxTraffic(trafficTimes) {
    return d3.max(trafficTimes, d => d.quantity) - 1400;
}

// hover text for bar graph
function hoverText(data, bikeLaneTypeNames) {
    return `Bike Lane Type: ${bikeLaneTypeNames[data.type]}<br/>
        Percent: ${data.percent}%<br/> 
        Neighborhood: ${data.neighborhood}`;
}

// hover text for accident graph
function crashHoverText(data, bikeLaneTypeNames) {
    return `Bike Lane Type: ${bikeLaneTypeNames[data.type]}<br/> 
        Accidents: ${data.crashes}<br/> 
        Neighborhood: ${data.neighborhood}`;
}

/* document loaded */
$(function() {
    let filterStreet;
    let bikeLaneData, trafficData, accidentData;
    // colors for bike lane types
    const colorScale = ["#fcd88a", "#cf7c1c", "#93c464", "#75734F", "#5eafc6", "#41a368", "#708dd4", "#73bfbf"];

    d3.csv("data/Street Segment Bike Lanes.csv").then(renderBarChart);
    d3.csv("data/BikeMVCounts.csv").then(renderLineChart);
    d3.csv("data/Accidents Bike Lanes.csv").then(renderCrashBarChart);

    function renderBarChart(data) {
        let streets = data.map(d => d["Location"]);
        let headers = Object.keys(data[0]);
        let bikeLaneTypes = headers.slice(2, 10);
        let lanes = formatBikeLaneData(data, bikeLaneTypes);
        bikeLaneData = formatBikeLaneData(data, bikeLaneTypes);

        let margin = {
                top: 20,
                right: 60,
                bottom: 180,
                left: 40
            },
            chart = {
                width: 550,
                height: 440,
            };
            chart.rightEdge = margin.left + chart.width;
            chart.bottomEdge = margin.top + chart.height;
            chart.totalHeight = chart.bottomEdge + margin.bottom;
            chart.totalWidth = chart.rightEdge + margin.right;

        let svg = d3.select("#vis-svg")
                .attr("width", chart.totalWidth)
                .attr("height", chart.totalHeight)
        .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        let xScale = d3.scaleLinear()
            .domain([0, data.length])
            .range([margin.left, chart.rightEdge]);

        // yScale is not inverted on the yScale
        let yScale = d3.scaleLinear()
            .domain([0, 100])
            .range([chart.bottomEdge, margin.top]);

        // heightscale where the y is inverted
        let heightScale = d3.scaleLinear()
            .domain([0, 100])
            .range([0, chart.height]);

        //y axis with labels
        let yAxis = d3.axisLeft()
            .scale(yScale)
            .tickSize(-chart.width)
            .tickFormat(d => (d + "%"));

        //x axis with labels
        let xAxis = d3.axisBottom()
            .scale(xScale)
            .tickFormat((d, i) => streets[i]);

        //add x and y axes to the svg
        svg.append("g")
            .attr("class", "yAxis")
            .call(yAxis)
            .attr("transform",`translate(${margin.left}, 0)`);

        svg.append("g")
            .attr("class", "xAxis")
            .call(xAxis)
            .attr("transform",`translate(0, ${chart.bottomEdge})`);

        //rotate x axis text
        d3.select("g.xAxis")
            .selectAll("text")
                .style("text-anchor", "end")
                .style("font-size", "12px")
                .attr("dx", "-.0em")
                .attr("dy", "2.5em")
                .attr("transform", "rotate(-65)");

        let tooltip = d3.select('body')
            .append("div")
            .classed('tooltip',true)
            .style("position", 'absolute')
            .style("z-index", "10")
            .style("visibility", "hidden")
            .style("background", d3.rgb(176, 196, 222, 1));

        // Create groups for each series, rects for each segment
        let groups = svg.selectAll("g.bars")
            .data(lanes)
            .enter().append("g")
                .attr("class", d => `bars street-${formatStreetNameAsClass(d[0].location)}`);

        // add full height bars
        groups.append("rect")
            .attr("class", d => `bars street-${formatStreetNameAsClass(d[0].location)}`)
            .attr("x", d => xScale(d[0].x) + 8)
            .attr("y", margin.top)
            .attr("height", chart.height)
            .attr("width", 40)
            .attr("stroke", "#000")
            .attr("stroke-width", "0px")
            .attr("fill", d3.rgb(0, 0, 0, 0));

        // add bar sections
        groups.selectAll("rect.bar")
            .data(d => d)
            .enter().append("rect")
                .attr("class", d => `street-${formatStreetNameAsClass(d.location)} lane-${d.type}`)
                .attr("x", d => xScale(d.x) + 8)
                .attr("y", d => yScale(d.y) - heightScale(d.percent))
                .attr("height", d => heightScale(d.percent))
                .attr("width", 40)
                .style("fill", (d, i) => colorScale[i])
                .on("mouseover", (d) => {
                    d3.selectAll(`rect.bars.street-${formatStreetNameAsClass(d.location)}`).attr("stroke-width", "10px");
                    filterStreet = d.location;
                    updateLineChart();
                    tooltip.html(hoverText(d, laneTypeNames));
                    tooltip.style("visibility", "visible");
                })
                .on("mousemove", () => {
                    tooltip.style("top", (d3.event.pageY-10) + "px").style("left",(d3.event.pageX + 10) + "px")
                })
                .on("mouseout", (d) => {
                    d3.selectAll(`rect.bars.street-${formatStreetNameAsClass(d.location)}`).attr("stroke-width", "0px");
                    filterStreet = null;
                    updateLineChart();
                    tooltip.style("visibility", "hidden");
                });

        // text label for the y axis
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left)
            .attr("x",-chart.height/2)
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Percentage of Street");

        // Add a title
        svg.append("text")
            .attr("x", chart.totalWidth/2)
            .attr("y", -margin.top/2)
            .attr("text-anchor", "middle")
            .style("font-size", "24px")
            .text("Bike Lanes on Boston Streets");

        function addLegend() {
            // Create Legend
            // create g for legend to go into
            let radius = 6;
            let svgLegend = svg.append('g')
                .attr('class', 'gLegend')
                .attr("transform", `translate(${chart.rightEdge + 10},${margin.top+40})`);

            // place legend on svg
            let legend = svgLegend.selectAll('.legend')
                .data(bikeLaneTypes)
                .enter().append('g')
                .attr("class", "legend")
                .attr("transform", (d, i) => `translate(0,${i*20})`)
                //assigned id
                .attr("id", (d, i) => `legend${i}`);

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
                .text(d => laneTypeNames[d]);
        }

        addLegend();

        /*let hovers = d3.selectAll(".gLegend .legend").each((d, i, list) => {
            let item = list[i];
            // d: lane type abbreviation
            // console.log(legendHoverText[laneTypeNames[d]]);
            d3.select("body").append("div")
                .attr("class", "legend-hover-text")
                .attr("id", `legend-hover-${i}`)
                .text("HASDYFSDF")
                .style("position", "absolute")
                .style("z-index", "10")
                .style("visibility", "hidden")
                .style('background', colorScale[i])
        });

        d3.selectAll(".gLegend .legend")
            .on("mouseover", (d, i) =>
                hovers[i].style("visibility", "visible"))
            .on("mousemove", (d, i) =>
                hovers[i].style("top", `${d3.event.pageY-10}px`).style("left",`${d3.event.pageX+10}px`))
            .on("mouseout", (d, i) =>
                hovers[i].style("visibility", "hidden"))
            .on("click", function () {
                console.log("Selecting legend")
            });*/

        let body = d3.select("body");
        let legendTooltips = [body.append("div"), body.append("div"), body.append("div"), body.append("div"),
            body.append("div"), body.append("div"), body.append("div"), body.append("div")];

        legendTooltips.forEach((d, i) =>
            d.style("position", "absolute")
                .style("z-index", "10")
                .style("width", "400px")
                .style("height","110px")
                .style("visibility", "hidden")
                .style('background', colorScale[i])
                .text(`${Object.keys(legendHoverText)[i]}: ${legendHoverText[Object.keys(legendHoverText)[i]]}`)
        );

        d3.selectAll(".gLegend .legend")
            .on("mouseover", (d, i) =>
                legendTooltips[i].style("visibility", "visible"))
            .on("mousemove", (d, i) =>
                legendTooltips[i].style("top", `${d3.event.pageY-10}px`).style("left",`${d3.event.pageX+10}px`))
            .on("mouseout", (d, i) =>
                legendTooltips[i].style("visibility", "hidden"))
            .on("click", function () {
                console.log("Selecting legend")
            });
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

        // set the ranges
        let x = d3.scaleTime()
            .domain(d3.extent(trafficData.bike.map(d => d.time)))
            .range([0, width]);
        let y = d3.scaleLinear()
            .domain([0, maxTraffic(trafficData.mv)])
            .range([height, 0]);

        // define the line
        let valueLine = d3.line()
            .x(d => x(d.time))
            .y(d => y(d.quantity));

        // append the svg object to the body of the page
        // appends a 'group' element to 'svg'
        // moves the 'group' element to the top left margin
        let group = d3.select(".line-chart")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .attr("class", "line-chart")
                .append("g")
                    .attr("transform",`translate(${margin.left},${margin.top})`);

        // Add the valueLine path for bikes
        group.append("path")
            .data([averageTraffic(trafficData.bike, times)])
            .attr("class", "line bike")
            .attr("d", valueLine)
            .attr("fill", "none")
            .attr("data-legend", d => d.type)
            .attr("stroke", "#b35a2d");

        // add average bike line
        group.append("path")
            .data([averageTraffic(trafficData.bike, times)])
            .attr("class", "line bike-average")
            .attr("d", valueLine)
            .attr("fill", "none")
            .attr("data-legend", d => d.type)
            .attr("stroke", "rgba(179,90,45,0.3)");

        //add bike icon
        group.append("image")
            .attr("class", "icon bike")
            .attr("x", 5)
            .attr("y", y(averageTraffic(trafficData.bike, times)[0].quantity) - 20)
            .attr("width", 20)
            .attr("height", 20)
            .attr("href", "images/bike-icon.png");

        // Add the valueLine path for motor vehicles
        group.append("path")
            .data([averageTraffic(trafficData.mv, times)])
            .attr("class", "line mv")
            .attr("d", valueLine)
            .attr("fill", "none")
            .attr("data-legend", "Motor Vehicles")
            .attr("stroke", "#346d94");

        // Add average motor vehicle line
        group.append("path")
            .data([averageTraffic(trafficData.mv, times)])
            .attr("class", "line mv-average")
            .attr("d", valueLine)
            .attr("fill", "none")
            .attr("data-legend", "Motor Vehicles")
            .attr("stroke", "rgba(52,109,148,0.3)");

        //add mv icon
        group.append("image")
            .attr("class", "icon mv")
            .attr("x", 5)
            .attr("y", y(averageTraffic(trafficData.mv, times)[0].quantity) - 20)
            .attr("width", 20)
            .attr("height", 20)
            .attr("href", "images/car-icon.png");

        // Add the X Axis
        group.append("g")
            .attr("transform", `translate(0,${height})`)
            .attr("class", "x-axis")
            .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%I %p")));

        // Add the Y Axis
        group.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(y));

        // text label for the x axis
        group.append("text")
            .attr("transform",`translate(${width/2},${height + margin.top - 20})`)
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
            .text("Average Vehicle Count");

        // Add a title
        d3.select(".line-chart")
            .append("g")
            .attr("class", "title")
                .append("text")
                    .attr("x", ((width + margin.left + margin.right + 30) / 2))
                    .attr("y", (margin.top / 2))
                    .attr("text-anchor", "middle")
                    .style("font-size", "16px")
                    .text("Average Car and Bike Vehicle Counts");
    }

    function renderCrashBarChart(data) {
        let formattedData = formatCrashData(data);
        accidentData = formattedData;
        let streets = data.map(d => d["Location"]);
        let margin = {
            top: 30,
            right: 60,
            bottom: 180,
            left: 63
        },
        chart = {
            width: 440,
            height: 300,
        };
        chart.rightEdge = margin.left + chart.width;
        chart.bottomEdge = margin.top + chart.height;
        chart.totalHeight = chart.bottomEdge + margin.bottom;
        chart.totalWidth = chart.rightEdge + margin.right;

        let svg = d3.select(".crash-chart")
                .attr("class", "crash-chart")
                .attr("width", chart.totalWidth)
                .attr("height", chart.totalHeight)
            .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`)
            let max = 24;

        let xScale = d3.scaleLinear()
            .domain([0, data.length])
            .range([0, chart.width]);

        // yScale is not inverted on the yScale
        let yScale = d3.scaleLinear()
            .domain([0, max])
            .range([chart.bottomEdge, margin.top]);

        // heightscale where the y is inverted
        let heightScale = d3.scaleLinear()
            .domain([0, max])
            .range([0, chart.height]);

        //x axis with labels
        let xAxis = d3.axisBottom()
            .scale(xScale)
            .tickFormat((d, i) => streets[i]);

        // add y axis
        svg.append("g")
            .call(d3.axisLeft(yScale));

        // add x axis
        svg.append("g")
            .attr("class", "xAxis")
            .call(xAxis)
            .attr("transform",`translate(0, ${chart.bottomEdge})`);

        // Add a title
        svg.append("text")
            .attr("x", chart.width/2 + 10)
            .attr("y", -margin.top/2)
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .text("Bike Accidents on Boston Streets");

        // text label for the y axis
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left)
            .attr("x",-chart.height/2)
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .style("font-size", "15px")
            .text("Number of Accidents");

        let groups = svg.selectAll(".bar")
            .data(accidentData)
            .enter().append("g")
                .attr("class", "bar");

        let tooltip = d3.select('body')
            .append("div")
            .classed('tooltip',true)
            .style("position", 'absolute')
            .style("z-index", "10")
            .style("visibility", "hidden")
            .style("background", d3.rgb(176, 196, 222, 1));

        // add full height bars
        groups.selectAll("rect.bar")
            .data(d => d)
            .enter().append("rect")
                .attr("class", d => `bars street-${formatStreetNameAsClass(d.location)}`)
                .attr("x", d => xScale(d.x) + 3)
                .attr("y", d => yScale(d.streetTotal))
                .attr("height", d => heightScale(d.streetTotal))
                .attr("width", 33)
                .attr("stroke", "#000")
                .attr("stroke-width", "0px")
                .attr("fill", d3.rgb(0, 0, 0, 0));

        groups.selectAll("rect.bar")
            .data(d => d)
            .enter().append("rect")
                .attr("class", d => d.type)
                .attr("x", d => xScale(d.x) + 3)
                .attr("y", d => yScale(d.y) - heightScale(d.crashes))
                .attr("height", d => heightScale(d.crashes))
                .attr("width", 33)
                .style("fill", (d, i) => colorScale[i])
                .on("mouseover", (d) => {
                    d3.selectAll(`rect.bars.street-${formatStreetNameAsClass(d.location)}`).attr("stroke-width", "10px");
                    filterStreet = d.location;
                    updateLineChart();
                    tooltip.html(crashHoverText(d, laneTypeNames));
                    tooltip.style("visibility", "visible");
                })
                .on("mousemove", () => {
                    tooltip.style("top", (d3.event.pageY-10) + "px").style("left",(d3.event.pageX + 10) + "px")
                })
                .on("mouseout", (d) => {
                    d3.selectAll(`.bars.street-${formatStreetNameAsClass(d.location)}`).attr("stroke-width", "0px");
                    filterStreet = null;
                    updateLineChart();
                    tooltip.style("visibility", "hidden");
                });

        //rotate x axis text
        svg.select("g.xAxis")
            .selectAll("text")
                .style("text-anchor", "end")
                .style("font-size", "9.5px")
                .attr("dx", "-.0em")
                .attr("dy", "2.5em")
                .attr("transform", "rotate(-65)");
    }

    // when a bar is hovered over, update view of line chart
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
            .range([0, width-100]);
        let y = d3.scaleLinear()
            .domain([0, maxTraffic(trafficData.mv)])
            .range([height-140, 0]);
        let valueLine = d3.line()
            .x(d => x(d.time))
            .y(d => y(d.quantity));

        //update bike line
        group.select(".line.bike")
            .data([averageTraffic(filteredData.bike, times)])
            .transition()
                .duration(300)
                .ease(d3.easeLinear)
                .attr("d", valueLine);

        //update mv line
        group.select(".line.mv")
            .data([averageTraffic(filteredData.mv, times)])
            .transition()
                .duration(300)
                .ease(d3.easeLinear)
                .attr("d", valueLine);

        //update mv icon
        d3.select(".icon.mv").transition()
            .duration(300)
            .ease(d3.easeLinear)
            .attr("y", y(averageTraffic(filteredData.mv, times)[0].quantity) - 20);

        //update bike icon
        d3.select(".icon.bike").transition()
            .duration(300)
            .ease(d3.easeLinear)
            .attr("y", y(averageTraffic(filteredData.bike, times)[0].quantity) - 20);

        //update chart title
        svg.select(".title text")
            .text("Average Car and Bike Vehicle Counts" + (filterStreet ? ` on ${filterStreet}` : ""));
    }
});
