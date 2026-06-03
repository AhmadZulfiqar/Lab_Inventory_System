const express = require('express');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 3000;
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const XLSX = require('xlsx');


// Models
const admindata = require('./models/admin');
const data = require('./models/schema');
const labnames = require('./models/labnumber');

// Configuration & Middleware
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method')); 
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
main()
    .then(() => console.log("Connected to MongoDB Atlas"))
    .catch(err => console.error("MongoDB Connection Error:", err));

async function main() {
    // Falls back to local only if the production variable isn't set
    const dbUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chatapp';
    await mongoose.connect(dbUrl);
}

// Server Startup
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

app.get("/", async (req, res) => {
    res.redirect("/lab/admin");
});

// View all labs and their inventory
app.get("/lab", async (req, res) => {
    try {
        let labs = await data.find({});
        let labname = await labnames.find({});
        res.render("labs.ejs", { allPcs: labs, showlabs: labname });
    } catch (err) {
        res.status(500).send("Error fetching lab assets.");
    }
});

// Dynamic routing replaces repetitive routes (/lab/lab1, /lab/lab2, etc.)
app.get("/lab/view/:roomName", async (req, res) => {
    try {
        const { roomName } = req.params;
        let labs = await data.find({ labRoom: roomName });
        res.render("labs.ejs", { allPcs: labs });
    } catch (err) {
        res.status(500).send("Error loading room data.");
    }
});

// Filter via dropdown submission
app.post("/lab", async (req, res) => {
    let { labRoom } = req.body;
    if (labRoom === "All" || !labRoom) {
        res.redirect("/lab");
    } else {
        let labname = await labnames.find({});
        let labs = await data.find({ labRoom: labRoom });
        res.render("labs.ejs", { allPcs: labs, showlabs: labname });
    }
});


// Page to add new PC batch
app.get("/lab/add", async (req, res) => {
    let showlabs = await labnames.find({});
    res.render("index.ejs", { showlabs });
});

// Bulk process batch insertion
app.post("/lab/add", async (req, res) => {
    let {
        labRoom,
        pcNumber, 
        processor,
        ram,
        ssdStorage,
        hddStorage,
        mouseStatus,
        keyboardStatus,
        quantity 
    } = req.body;

    try {
        const qty = parseInt(quantity) || 1;
        const startNumber = parseInt(pcNumber) || 1;
        let batchData = [];

        for (let i = 0; i < qty; i++) {
            batchData.push({
                labRoom: labRoom,
                pcNumber: startNumber + i, 
                specs: {
                    processor: processor,
                    ram: ram,
                    SSD: ssdStorage,
                    HDD: hddStorage
                },
                peripherals: {
                    mouse: { status: mouseStatus },
                    keyboard: { status: keyboardStatus }
                }
            });
        }

        await data.insertMany(batchData);
        console.log(`${qty} PCs saved successfully to ${labRoom}`);
        res.redirect("/lab");
    } catch (err) {
        console.error("Error saving multiple data entries:", err);
        res.status(500).send("Failed to save data");
    }
});

// Render single PC edit page
app.get("/lab/edit/:id", async (req, res) => {
    let { id } = req.params;
    let labdata = await data.findById(id);
    let showlabs = await labnames.find({});
    res.render("edit.ejs", { labdata, showlabs });
});

// Process single PC Update
app.put("/lab/edit/:id", async (req, res) => {
    let { id } = req.params;
    let {
        labRoom,
        processor,
        ram,
        SSD,  
        HDD,  
        mouseStatus,
        keyboardStatus,
    } = req.body;

    try {
        await data.findByIdAndUpdate(id, {
            labRoom: labRoom,
            specs: { processor, ram, SSD, HDD },
            peripherals: {
                mouse: { status: mouseStatus },
                keyboard: { status: keyboardStatus }
            }
        });
        console.log("Data updated successfully");
        res.redirect("/lab");
    } catch (err) {
        console.error("Error updating data:", err);
        res.status(500).send("Failed to update data");
    }
});

// Delete individual PC
app.delete("/lab/delete/:id", async (req, res) => {
    let { id } = req.params;
    try {
        await data.findByIdAndDelete(id);
        console.log("Data deleted successfully");
        res.redirect("/lab");
    } catch (err) {
        console.error("Error deleting data:", err);
        res.status(500).send("Failed to delete data");
    }
});



app.get("/lab/new", (req, res) => {
    res.render("newlab.ejs");
});

app.post("/lab/new", async (req, res) => {
    try {
        const { labName } = req.body;
        let newLab = new labnames({ LabName: labName });
        await newLab.save();
        console.log("New Lab Created:", labName);
        res.redirect("/lab");
    } catch (err) {
        res.status(500).send("Error creating lab: " + err.message);
    }
});

app.get("/lab/deletelab", async (req, res) => {
    let showlabs = await labnames.find({});
    res.render("deletelab.ejs", { showlabs });
});

// Cascading Delete: Removes room index and clears out all PCs associated with it
app.delete("/lab/deletelab/:id", async (req, res) => {
    const { id } = req.params;
    try {
        let lab = await labnames.findById(id);
        if (lab) {
            await data.deleteMany({ labRoom: lab.LabName });
            await labnames.findByIdAndDelete(id);
            console.log(`Cascading delete complete for ${lab.LabName}`);
        }
        res.redirect("/lab");
    } catch (err) {
        console.error("Error during deletion process:", err);
        res.status(500).send("Internal Server Error during deletion.");
    }
});





app.get("/lab/admin", (req, res) => {
    res.render("admin.ejs");
});

// Login validation corrected to map both username and password safely
app.post("/lab/admin", async (req, res) => {
    let { username, password } = req.body;
    let adminfound = await admindata.findOne({ username: username, password: password });
    if (adminfound) {
        res.redirect("/lab");
    } else {
        res.send("Invalid Credentials");
    }
});

app.get("/admin/add", (req, res) => {
    res.render("addadmin.ejs");
});

app.post("/admin/add", async (req, res) => {
    try {
        let { username, password, phoneNo } = req.body;
        let newadmin = new admindata({
            username: username,
            phone: phoneNo,
            password: password
        });
        await newadmin.save();
        res.redirect("/lab");
    } catch (err) {
        res.status(500).send("Error registration failed.");
    }
});

app.get("/lab/admin/forgot", (req, res) => {
    res.render("forgotadmin.ejs");
});

app.post("/lab/admin/forgot", async (req, res) => {
    let { phone } = req.body;
    let adminfound = await admindata.findOne({ phone: phone });
    if (adminfound) {
        res.render("resetadmin.ejs", { username: adminfound.username });
    } else {
        res.send("No such admin found");
    }
});

app.post("/lab/admin/reset-password", async (req, res) => {
    let { username, newpassword } = req.body;
    try {
        await admindata.findOneAndUpdate({ username: username }, { password: newpassword });
        res.redirect("/lab/admin");
    } catch (err) {
        res.status(500).send("Error resetting password");
    }
});





app.post("/lab/export", async (req, res) => {
    try {
        let { labRoom } = req.body;
        let allPcs;

        if (!labRoom || labRoom === "All") {
            allPcs = await data.find({});
        } else {
            allPcs = await data.find({ labRoom: labRoom });
        }

        if (allPcs.length === 0) {
            return res.status(404).send("No inventory data found for this selection.");
        }

        const excelData = allPcs.map((pc, index) => ({
            "Sr No.": index + 1,
            "Lab Room": pc.labRoom,
            "PC Number": pc.pcNumber || "N/A",
            "Processor": pc.specs?.processor || "N/A",
            "RAM": pc.specs?.ram || "N/A",
            "SSD": pc.specs?.SSD || "N/A",
            "HDD": pc.specs?.HDD || "N/A",
            "Mouse Status": pc.peripherals?.mouse?.status || "N/A",
            "Keyboard Status": pc.peripherals?.keyboard?.status || "N/A"
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Lab Inventory");

        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${labRoom || "All"}_Inventory_Report.xlsx`);
        
        res.send(buffer);
    } catch (err) {
        console.error("Export Error:", err);
        res.status(500).send("Could not generate Excel file");
    }
});

module.exports = app;